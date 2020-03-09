const START_OPACITY = 0.8;
let data;

const toNumber = n => parseInt(n === "" ? 0 : n);

d3.json("data2.json").then(d => {
  console.error(
    d[0].filter(d => d.appuntamenti.length == 0).length +
      " eventi senza appuntamenti!"
  );

  data = d[0]
    .filter(d => d.appuntamenti.length > 0)
    .map(dd => {
      dd.appuntamenti = dd.appuntamenti.map(d =>
        moment(d, "YYYY-MM-DD ").toDate()
      );

      dd.start = d3.min(dd.appuntamenti);
      dd.end = d3.max(dd.appuntamenti);
      dd.prezzo = toNumber(dd.prezzo);
      dd.partecipanti = toNumber(dd.pugliesi) + toNumber(dd.nonpugliesi);
      return dd;
    })
    .sort((a, b) => {
      if (!a.start) console.log(a);

      return a.start - b.start;
    });

  const margin = { top: 100, right: 20, bottom: 350, left: 100 };
  const height = window.innerHeight - 20;
  const width = window.innerWidth - 20;

  const x = d3
    .scaleTime()
    .domain([d3.min(data, d => d.start), d3.max(data, d => d.end)])
    .nice()
    .range([margin.left, width - margin.right - margin.left]);

  const yPartecipanti = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d.partecipanti).reverse())
    .nice()
    .range([margin.top, height - margin.top - margin.bottom]);

  const r = d3
    .scaleSqrt()
    .domain(d3.extent(data, d => d.prezzo))
    .nice()
    .range([8, 20]);

  const color = d3.scaleOrdinal(
    data.map(d => d.xyz),
    d3.schemeCategory10
  );

  let currentScale = 1;

  const zoom = d3.zoom().on("zoom", () => {
    const k = d3.event.transform.k;
    const tx = d3.event.transform.x / k;
    currentScale = k;
    x.range([
      (margin.left + tx) * k,
      (tx + width - margin.right - margin.left) * k
    ]);
    update();
  });

  let nonsvoltiCount = 0;
  let svoltiCount = 0;
  //add shortcuts
  data = data.map(d => {
    d.x = x(d.start) || 0;
    d.svolto = d.status;
    d.color = d.svolto ? color(d.category) : "#ddd";
    d.r = d.svolto ? r(d.prezzo) : 2;
    d.y = d.svolto
      ? margin.top + svoltiCount * 6
      : height - margin.bottom + nonsvoltiCount * 6;
    !d.svolto ? nonsvoltiCount++ : svoltiCount++;
    return d;
  });

  const update = () => {
    data = data.map(d => {
      d.x = x(d.start) || 0;
      return d;
    });

    d3.selectAll(".corso-svolto")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .each(function(d) {
        d3.select(this)
          .select(".hitarea")
          .attr("width", x(d.end) - x(d.start) + d.r * 2);

        d3.select(this)
          .select(".line")
          .attr("width", x(d.end) - x(d.start) + 4);

        d3.select(this)
          .select(".events")
          .selectAll("rect")
          .attr("transform", dd => `translate(${x(dd) - d.x}, -4)`);
      });

    d3.select(".xAxis").call(
      d3.axisBottom(x).ticks((width * currentScale) / 80)
    );
  };

  const xAxis = g => {
    g.attr(
      "transform",
      `translate(0,${height - margin.top - margin.bottom + 50})`
    )
      .attr("class", "xAxis")
      .call(d3.axisBottom(x).ticks(width / 80));
  };

  const yAxis = g => {
    g.attr("transform", `translate(${margin.left},0)`)
      .attr("class", "yAxis")
      .call(d3.axisLeft(yPartecipanti))
      .call(g => {
        g.append("text")
          .attr("transform", `translate(-40,0) rotate(-90)`)
          .attr("text-anchor", "start")
          .attr("class", "axisLabel")
          .text("partecipanti");
      });
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
    .style("right", "300px")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("dy", "0.35em");

  const dropdown = d3
    .select("body")
    .append("select")
    .style("position", "absolute")
    .style("top", "30px")
    .style("left", "30px")
    .on("change", d => {
      currentYaxis = d3.event.target.selectedIndex;
      updateYAxis();
    });

  dropdown
    .selectAll("option")
    .data(["partecipanti", "costo"])
    .join("option")
    .text(d => d)
    .attr("value", d => d);

  let activeNode = null;

  const hideTooltip = function() {
    tooltip.style("visibility", "hidden");

    const d = activeNode.datum();
    d3.selectAll(".corso-svolto")
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
        .map(k => `<p>${k}: ${o[k]}</p>`)
        .join("");
    };

    tooltip.style("visibility", "visible").html(
      format({
        titolo: d.titolo,
        utile: d.utile + "€",
        start: d.start,
        end: d.end,
        partecipanti: d.partecipanti,
        luogo: d.luogo,
        xyz: d.xyz,
        tags: d.tags
      })
    );
    // .style("transform", `translate(${d.x}px, ${d.y}px)`);

    activeNode = d3.select(this);
    d3.selectAll(".corso-svolto")
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
    .selectAll("g.corso-svolto")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "corso-svolto")
    .style("opacity", START_OPACITY)
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .each(function(d) {
      // main circle
      //   d3.select(this)
      //     .append("circle")
      //     .style("pointer-events", "none")
      //     .attr("stroke", d3.color(d.color).darker()) //"rgba(0,0,0,.2)";
      //     .attr("fill", d.color) //"rgba(0,0,0,.2)";
      //     .attr("r", d.r);

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

      // hit area
      d3.select(this)
        .append("rect")
        .attr("class", "hitarea")
        .style("cursor", "pointer")
        .attr("fill", "rgba(255,255,0,0)")
        .attr("transform", `translate(${-d.r},${-d.r})`)
        .attr("height", d.r * 2)
        .attr("width", x(d.end) - x(d.start) + d.r * 2);
    })
    .on("mouseout", hideTooltip)
    .on("mouseover", showTooltip);

  svg.append("g").call(xAxis);

  svg
    .append("rect")
    .attr("width", margin.left)
    .attr("height", height);

  svg
    .append("rect")
    .attr("x", width - margin.right)
    .attr("width", margin.right)
    .attr("height", height);

  svg.append("g").call(yAxis);
});
