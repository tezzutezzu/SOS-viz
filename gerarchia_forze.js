const margin = { top: 30, right: 10, bottom: 0, left: 100 };

const svgContainer = d3.select("body");
const bb = svgContainer.node().getBoundingClientRect();
const width = window.innerWidth;
const height = window.innerHeight;
const tooltip = d3.select(".mytooltip");

const svg = d3
  .select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .on("mousemove", () => {
    const { x, y } = d3.event;
    tooltip.style("transform", (d) => `translate(${x}px, ${y + 20}px)`);
  });

function loadData() {
  d3.tsv(
    `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6JaRaOSvLt7__vHDjyV4BqInwBGJ0vIxypU6C7KYaPZEzWd5U7f77GWnN6NRxzVKDKAx6E8AjIXk3/pub?gid=1874848177&single=true&output=tsv`
  ).then((data) => {
    var root = d3
      .stratify()
      .id(function (d) {
        return d.Child;
      })
      .parentId(function (d) {
        return d.Parent;
      })(data);

    let links = root.links();
    let nodes = root.descendants();

    // links = links.slice(5);
    // nodes = nodes.slice(1);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(0)
          .strength(1)
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d) => {
          console.log(d);
          return -parseFloat(d.data.Size) * 100;
        })
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = svg.append("g").selectAll("g").data(nodes).join("g");

    node
      .append("circle")
      .attr("fill", (d) => (d.children ? "#fff" : "#000"))
      .attr("stroke", (d) => (d.children ? "#ddd" : "#fff"))
      .attr("r", (d) => +d.data.Size * 0.2 + 5);

    node.each(function (d) {
      const el = d3.select(this);
      if (d.children) {
        el.append("text")
          .attr("text-anchor", "middle")
          .text((d) => d.data.Child);
      } else {
        el.on("mouseover", function (d) {
          const el = d3.select(this);
          el.select("circle").attr("fill", "red");
          tooltip.text(d.data.Child);
        });

        el.on("mouseout", function (d) {
          const el = d3.select(this);
          el.select("circle").attr("fill", "black");
          tooltip.text("");
        });
      }
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x} ${d.y})`);
    });
  });
}

loadData();
