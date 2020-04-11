d3.tsv(
  "https://docs.google.com/spreadsheets/d/1_JegyoJ_XhDOp5gZKRVqb6iAuGKHpQ4NcHfO9Xz51Mo/export?format=tsv"
).then((data) => {
  const dataCorsi = getCleanData(data);
  const width = window.innerWidth - 20;
  const height = window.innerHeight;
  const margins = { top: 100, bottom: 100, left: 200, right: 100 };

  const svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataCorsi, (d) => d.mediaPartecipanti).reverse())
    .range([margins.top, height - margins.top - margins.bottom]);

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(dataCorsi, (d) => d.corsi.length))
    .range([margins.left, width - margins.left - margins.right]);

  let selectedNode = null;

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("left", 0)
    .style("top", 0);

  dataCorsi.forEach((d) => {
    d.x = xScale(d.corsi.length);
    d.y = yScale(d.mediaPartecipanti);
  });

  const circles = svg
    .selectAll("circle")
    .data(dataCorsi)
    .join("g")
    .on("mouseover", (d) => console.log(d));

  circles
    .append("circle")
    .attr("fill", "white")
    .style("opacity", 0.5)
    .attr("r", 5)
    .attr("transform", (d) => {
      return `translate(${d.x} ${d.y})`;
    })
    .on("mouseout", (d) => {
      tooltip.style("opacity", 0);
      selectedNode.transition().style("opacity", 0.2);
    })
    .on("mouseover", function (d) {
      const el = d3.select(this);
      selectedNode = el;
      selectedNode.style("opacity", 1);

      tooltip.style("opacity", 1);
      tooltip
        .html(
          `
          <p><b>keyword</b> ${d.keyword}</p>
          <p><b>partecipanti</b> ${d.mediaPartecipanti}</p>
        `
        )
        .style("left", d3.event.pageX + 50 + "px")
        .style("top", d3.event.pageY - 38 + "px");
    });

  svg
    .append("g")
    .attr(
      "transform",
      `translate(0,${height - margins.top - margins.bottom + 50})`
    )
    .attr("class", "xAxis")
    .call(d3.axisBottom(xScale).ticks(width / 80));

  svg
    .append("g")
    .attr("transform", `translate(${margins.left - 30},0)`)
    .attr("class", "xAxis")
    .call(d3.axisLeft(yScale));

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      `translate(${margins.left - 60}, ${height / 2}) rotate(-90)`
    )
    .text("media partecipanti");

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      `translate(${width / 2 - margins.left}, ${height - margins.bottom})`
    )
    .text("frequenza keyword");

  function getCleanData(data) {
    const dictionary = {};

    data.forEach((corso) => {
      const key =
        "Indice degli argomenti che si tratterebbero nell'attività (parole chiave)";

      corso[key].split(", ").forEach((kk) => {
        const k = kk.toLowerCase();

        const titolo = corso;
        if (!dictionary[k]) dictionary[k] = { corsi: [] };
        if (dictionary[k].corsi.indexOf(titolo) == -1) {
          dictionary[k].corsi.push(corso);
        }
      });
    });

    const corsiPerKeyword = Object.keys(dictionary)
      .sort(d3.ascending)
      .map((d) => {
        let numPartecipanti = 0;
        let keywordObject = dictionary[d];
        keywordObject.corsi.forEach((d) => {
          numPartecipanti += parseInt(
            d["Qual è il numero massimo di partecipanti previsto?"]
          );
        });
        keywordObject.mediaPartecipanti =
          numPartecipanti / keywordObject.corsi.length;

        return {
          [d]: keywordObject,
        };
      });

    const dataCorsi = corsiPerKeyword
      .filter((d) => {
        return d[Object.keys(d)].corsi.length > 0;
      })
      .map((d) => {
        const keyword = Object.keys(d)[0];
        return {
          keyword,
          mediaPartecipanti: d[keyword].mediaPartecipanti,
          corsi: d[keyword].corsi,
        };
      })
      .sort((a, b) => {
        return b.corsi.length - a.corsi.length;
      });

    return dataCorsi;
  }

  function dodge(data, radius) {
    const radius2 = radius ** 2;
    const circles = data
      .map((d) => ({ x: d.x, y: d.y, data: d }))
      .sort((a, b) => a.x - b.x);

    const epsilon = 1e-3;
    let head = null,
      tail = null;

    // Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
    function intersects(x, y) {
      let a = head;
      while (a) {
        if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) {
          return true;
        }
        a = a.next;
      }
      return false;
    }

    // Place each circle sequentially.
    for (const b of circles) {
      // Remove circles from the queue that can’t intersect the new circle b.
      while (head && head.x < b.x - radius2) head = head.next;

      // Choose the minimum non-intersecting tangent.
      if (intersects(b.x, b.y)) {
        let a = head;

        do {
          let y = a.y + Math.sqrt(radius2 - (a.x - b.x) ** 2);
          if (y < b.y && !intersects(b.x, y)) b.y = y;
          a = a.next;
        } while (a);
      }

      // Add b to the queue.
      b.next = null;
      if (head === null) head = tail = b;
      else tail = tail.next = b;
    }

    return circles;
  }
});
