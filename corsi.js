const START_OPACITY = 0.8;
let data;
let originalData;
let smallR = 2;
const toNumber = n => parseInt(n === "" ? 0 : n);
fetch("https://www.lascuolaopensource.xyz/didattica/index")
  .then(response => response.json())
  .then(d => {
    originalData = [...d[0]];
    data = d[0]
      .filter(d => d.appuntamenti.length > 0)
      .map(dd => {
        dd.appuntamenti = dd.appuntamenti.map(d =>
          moment(d, "YYYY-MM-DD ").toDate()
        );
        let utile = dd.utile.replace(",", "");
        if (utile === "") utile = 0;

        dd.utile = parseInt(utile);
        dd.start = d3.min(dd.appuntamenti);
        dd.end = d3.max(dd.appuntamenti);
        dd.prezzo = toNumber(dd.prezzo);
        dd.partecipanti = toNumber(dd.pugliesi) + toNumber(dd.nonpugliesi);
        return dd;
      })
      .sort((a, b) => b.start - a.start);

    const margin = { top: 50, right: 20, bottom: 50, left: 40 };
    const height = window.innerHeight - 20;
    const width = window.innerWidth - 20;

    const yRange = [margin.top, height - margin.bottom];
    const y = d3
      .scaleLinear()
      .domain([0, data.length])
      .range(yRange);

    const x = d3
      .scaleTime()
      .domain([d3.min(data, d => d.start), d3.max(data, d => d.end)])
      .nice()
      .range([margin.left, width - margin.right - margin.left]);

    const yParticipant = d3
      .scaleLinear()
      .domain(d3.extent(data, d => d.partecipanti).reverse())
      .range(yRange);

    const yUtile = d3
      .scaleLinear()
      .domain(d3.extent(data, d => d.utile).reverse())
      .range(yRange);

    const r = d3.scaleSqrt().domain(d3.extent(data, d => d.partecipanti));
    r.range([smallR * 1.5, smallR * 5]);

    const color = d3.scaleOrdinal(
      data.map(d => d.xyz),
      ["#ffd400", " #dc64d6", "#12c8bb"]
    );

    // application state
    const visualizedItems = {
      x: true,
      y: true,
      z: true,
      "non svolti": true
    };

    const yScales = {
      indice: y,
      participant: yParticipant,
      utile: yUtile
    };

    let currentZoom = 1;

    const zoom = d3.zoom().on("zoom", () => {
      const k = d3.event.transform.k;
      const tx = d3.event.transform.x / k;
      const ty = d3.event.transform.y / k;
      currentZoom = k;
      x.range([
        (margin.left + tx) * k,
        (tx + width - margin.right - margin.left) * k
      ]);

      // y.range([
      //   (margin.top + ty) * k,
      //   (ty + height - margin.top - margin.bottom) * k
      // ]);

      update();
    });

    let currentY = y;

    //add shortcuts
    data = data.map((d, i) => {
      d.x = x(d.start) || 0;
      d.svolto = d.status;
      d.color = d.svolto ? color(d.xyz) : "#ddd";
      d.index = i;
      d.y = currentY(i);
      return d;
    });

    const updateData = () => {
      data.forEach((d, i) => {
        d.x = x(d.start) || 0;
        let datum;
        switch (currentY) {
          case y:
            datum = d.index;
            break;
          case yParticipant:
            datum = d.partecipanti;
            break;
          case yUtile:
            datum = d.utile;
            break;
        }

        d.y = currentY(datum);
      });
    };

    const update = () => {
      updateData();
      svg.selectAll(".yearLine").attr("transform", d => `translate(${x(d)} 0)`);

      d3.selectAll(".corso")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .each(function(d) {
          const el = d3.select(this);

          const isVisible = d.svolto
            ? visualizedItems[d.xyz]
            : visualizedItems["non svolti"];

          el.style("visibility", isVisible ? "visible" : "hidden");
          el.select(".line").attr("x2", x(d.end) - x(d.start));

          el.select("circle").attr("r", d.svolto ? r(d.partecipanti) : 2);

          el.select(".events")
            .selectAll("circle")
            .attr("r", smallR)
            .attr("transform", dd => `translate(${x(dd) - d.x}, 0)`);
        });

      d3.select(".xAxis").call(
        d3.axisBottom(x).ticks((width * currentZoom) / 80)
      );
    };

    const updateYAxis = () => {
      updateData();

      d3.selectAll(".corso")
        .transition()
        .delay((d, i) => i * 10)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    };

    const xAxis = g => {
      g.attr(
        "transform",
        `translate(0,${height - margin.top - margin.bottom + 50})`
      )
        .attr("class", "xAxis")
        .call(d3.axisBottom(x).ticks(width / 80));
    };

    const svg = d3
      .select("body")
      .append("svg")
      .style("cursor", "move")
      .attr("height", height)
      .attr("width", width)
      .call(zoom);

    const tooltip = d3
      .select("body")
      .append("pre")
      .style("pointer-events", "none")
      .style("width", `100px`)
      .style("position", "absolute")
      .style("top", "0")
      .style("right", "500px")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("dy", "0.35em");

    let activeNode = null;

    const hideTooltip = function() {
      tooltip.style("visibility", "hidden");

      const d = activeNode.datum();
      d3.selectAll(".corso")
        .transition()
        .style("opacity", START_OPACITY);

      activeNode
        .select(".events")
        .style("visibility", "visible")
        .each(function() {
          d3.select(this)
            .selectAll("rect")
            .transition()
            .style("opacity", 0);
        });
    };

    const showTooltip = function(d) {
      const format = o => {
        return Object.keys(o)
          .map(k => `<p><b>${k}</b><br/>${o[k]}</p>`)
          .join("");
      };

      tooltip.style("visibility", "visible").html(
        format({
          titolo: d.titolo,
          utile: d.utile + "€",
          start: d.start,
          svolto: d.svolto,
          end: d.end,
          partecipanti: d.partecipanti,
          luogo: d.luogo,
          xyz: d.xyz,
          tags: d.tags
        })
      );

      activeNode = d3.select(this);
      d3.selectAll(".corso")
        .transition()
        .style("opacity", dd => (d != dd ? 0.2 : 1));

      activeNode
        .select(".events")
        .style("visibility", "visible")
        .each(function(d) {
          d3.select(this)
            .selectAll("rect")
            .transition()
            .style("opacity", 1);
        });
    };

    svg
      .selectAll(".yearLine")
      .data([
        new Date("2017/1/1"),
        new Date("2018/1/1"),
        new Date("2019/1/1"),
        new Date("2020/1/1")
      ])
      .join("line")
      .attr("class", "yearLine")
      .attr("transform", d => `translate(${x(d)} 0)`)
      .attr("stroke", "#333")
      .attr("y1", margin.top)
      .attr("y2", height - margin.top);

    svg
      .selectAll("g.corso")
      .data(data)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .attr("class", "corso")
      .style("opacity", START_OPACITY)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .each(function(d) {
        // main circle
        d3.select(this)
          .append("circle")
          .attr("fill", d.color) //"rgba(0,0,0,.2)";
          .attr("r", d.r);

        if (d.appuntamenti.length > 1) {
          const lineheight = 4;
          // events liine
          d3.select(this)
            .append("line")
            .attr("class", "line")
            .style("pointer-events", "none")
            .attr("stroke", d3.color(d.color))
            .attr("x1", 0)
            .attr("x2", x(d.end) - x(d.start) || 0);

          // d3.select(this)
          //   .append("text")
          //   .style("font-size", 6)
          //   .style("font-family", "sans-serif")
          //   .attr("x", d => -d.r)
          //   .attr("text-anchor", "end")
          //   .text(d => d.titolo);

          if (d.svolto) {
            // other events
            d3.select(this)
              .append("g")
              .attr("class", "events")
              .style("pointer-events", "none")
              .selectAll("circle")
              .data(d.appuntamenti) //.slice(1))
              .join("circle")
              .attr("transform", dd => `translate(${x(dd) - d.x}, 0)`)
              .attr("fill", d.color) //"rgba(0,0,0,.2)";
              .attr("stroke", d3.color(d.color)) //"rgba(0,0,0,.2)";
              .attr("fill", d3.color(d.color).brighter()) //"rgba(0,0,0,.2)";
              .attr("r", 2);
          }
        }
      })
      .on("mouseout", hideTooltip)
      .on("mouseover", showTooltip);

    svg.append("g").call(xAxis);

    update();

    const controls = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("top", 10 + "px")
      .style("left", 10 + "px");

    const dropdown = controls.append("select").on("change", d => {
      currentY = yScales[d3.event.target.value];
      updateYAxis();
    });

    dropdown
      .selectAll("option")
      .data(Object.keys(yScales))
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    const checkboxes = controls
      .selectAll("div")
      .data(Object.keys(visualizedItems))
      .join("div");

    checkboxes
      .append("input")
      .attr("name", d => d)
      .attr("type", "checkbox")
      .attr("checked", true)
      .on("change", (d, i) => {
        visualizedItems[d] = !visualizedItems[d];

        const activeItems = [];
        Object.keys(visualizedItems).forEach(d => {
          if (visualizedItems[d]) activeItems.push(d);
        });

        let c = 0;
        data.forEach(d => {
          if (activeItems.indexOf(d.xyz) != -1) {
            if (d.index == -1) d.entering = true;
            d.index = c;
            c++;
          } else {
            if (d.index != -1) d.entering = false;
            d.index = -1;
          }
        });

        y.domain([0, c]);

        updateData();

        d3.selectAll(".corso")
          .transition()
          .duration(d => (d.index == -1 ? 0 : 600))
          .attr("transform", d => `translate(${d.x},${d.y})`)
          .style("opacity", d => (d.index == -1 ? 0 : 1));
      });

    checkboxes
      .append("label")
      .style("color", "white")
      .attr("for", d => d)
      .text(d => d);
  });
