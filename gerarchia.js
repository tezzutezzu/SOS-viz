const margin = { top: 30, right: 10, bottom: 0, left: 100 };

const svgContainer = d3.select("body");
const bb = svgContainer.node().getBoundingClientRect();
const width = 5000;
const height = 1000;

const svg = d3
  .select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const tooltip = d3.select(".mytooltip");
const tree = (data) => {
  const root = d3.hierarchy(data);
  root.dx = 30;
  root.dy = 400;
  return d3.tree().nodeSize([root.dx, root.dy])(root);
};

function loadData() {
  d3.tsv(
    `https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6JaRaOSvLt7__vHDjyV4BqInwBGJ0vIxypU6C7KYaPZEzWd5U7f77GWnN6NRxzVKDKAx6E8AjIXk3/pub?gid=1874848177&single=true&output=tsv`
  ).then((d) => {
    console.log(d);

    let data = d3
      .stratify()
      .id(function (d) {
        return d.Child;
      })
      .parentId(function (d) {
        return d.Parent;
      })(d);

    const root = tree(data);

    let x0 = Infinity;
    let x1 = -x0;
    root.each((d) => {
      if (d.x > x1) x1 = d.x;
      if (d.x < x0) x0 = d.x;
    });

    const g = svg
      .append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("transform", `translate(${root.dy / 3},${root.dx - x0})`);

    // Enter any new nodes at the parent's previous position.
    const node = g
      .append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node
      .append("circle")
      .attr("fill", (d) => (d.children ? "#555" : "#999"))
      .attr("r", (d) => {
        return +d.data.data.Size;
      });

    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => (d.children ? -6 : 6))
      .attr("text-anchor", (d) => (d.children ? "end" : "start"))
      .text((d) => {
        console.log(d);
        return d.data.data.Child;
      });

    // Enter any new links at the parent's previous position.
    g.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x((d) => d.y)
          .y((d) => d.x)
      );
  });
}

loadData();
