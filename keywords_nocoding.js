d3.tsv(
  "https://docs.google.com/spreadsheets/d/1_JegyoJ_XhDOp5gZKRVqb6iAuGKHpQ4NcHfO9Xz51Mo/export?format=tsv"
).then(data => {
  const dataCorsi = getCleanData(data);
  const width = window.innerWidth - 20;
  const height = window.innerHeight;
  let nodes = {};

  let radiusScale = d3
    .scaleLinear()
    .domain(d3.extent(dataCorsi, d => d.corsi.length))
    .range([10, 100]);

  // start simulation
  var simulation = d3
    .forceSimulation(dataCorsi)
    .force(
      "charge",
      d3.forceManyBody().strength(d => d.corsi.length * 0.1)
    )
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius(d => radiusScale(d.corsi.length))
    )
    .on("tick", ticked);

  const svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const circles = svg
    .selectAll("circle")
    .data(dataCorsi)
    .join("g")
    .on("mouseover", d => console.log(d));

  circles
    .append("circle")
    .attr("fill", "white")
    .attr("r", d => radiusScale(d.corsi.length));

  circles
    .append("text")
    .attr("text-anchor", "middle")
    .text(d => {
      return d.corsi.length > 5 ? d.keyword : "";
    });

  function ticked() {
    simulation.alpha(1);
    circles.attr("transform", d => `translate(${d.x} ${d.y})`);
  }

  function getCleanData(data) {
    const dictionary = {};
    data.forEach(corso => {
      const key =
        "Indice degli argomenti che si tratterebbero nell'attività (parole chiave)";

      corso[key].split(", ").forEach(kk => {
        const k = kk.toLowerCase();
        if (k !== "coding") {
          const titolo = corso["Titolo (o nome) dell'attività"];
          if (!dictionary[k]) dictionary[k] = { corsi: [] };
          if (dictionary[k].corsi.indexOf(titolo) == -1) {
            dictionary[k].corsi.push(corso["Titolo (o nome) dell'attività"]);
          }
        }
      });
    });

    const corsiPerKeyword = Object.keys(dictionary)
      .sort(d3.ascending)
      .map(d => {
        return {
          [d]: dictionary[d]
        };
      });

    const dataCorsi = corsiPerKeyword
      .filter(d => {
        return d[Object.keys(d)].corsi.length > 1;
      })

      .map(d => {
        return {
          keyword: Object.keys(d)[0],
          corsi: d[Object.keys(d)[0]].corsi
        };
      })
      .sort((a, b) => {
        return b.corsi.length - a.corsi.length;
      });

    return dataCorsi;
  }
});
