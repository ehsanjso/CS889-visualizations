import { count } from "d3";
import "./assets/scss/app.scss";

var $ = require("jquery");
var d3 = require("d3");
var R = require("ramda");

$(document).ready(function () {
  d3.json("/data/miserables.json").then(function (data) {
    console.log(data);
    drawGraph(data);
    // drawMatrix(data);
  });

  var worker = new Worker(new URL("./worker.js", import.meta.url));

  worker.addEventListener(
    "message",
    function (e) {
      console.log("Worker said: ", e.data);
    },
    false
  );

  worker.postMessage("Hello World"); // Send data to our worker.
});

function drawGraph(data) {
  const clonedData = R.clone(data);
  // 1. Access data
  const links = clonedData.links;
  const nodes = clonedData.nodes;
  nodes.sort(function (a, b) {
    return b.group - a.group;
  });

  const radius = 10;

  // set data constants

  // 2. Create chart dimensions

  const padding = 20;
  const width = window.innerWidth - padding * 2;
  const height = window.innerHeight - padding * 2;
  let dimensions = {
    width: width,
    height: height,
    margin: {
      top: 50,
      right: 20,
      bottom: 50,
      left: 50,
    },
  };
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  // 3. Draw canvas

  const wrapper = d3
    .select(`#wrapper`)
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  const bounds = wrapper
    .append("g")
    .attr("class", "bounds")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  // 4. Create scales

  const scale = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(10));
  const color = (d) => scale(d.group);

  // 5. Draw data

  var tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links).id((d) => d.id)
      // .strength(0.3)
    )
    .force("charge", d3.forceManyBody().strength(-80))
    .force("collision", d3.forceCollide().radius(radius * 1.2))
    .force("center", d3.forceCenter(width / 2 - 100, height / 2 - 100));

  // select the svg area

  const link = bounds
    .append("g")
    .attr("stroke", "#aaa")
    .attr("stroke-opacity", 0.3)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", (d) => Math.sqrt(d.value) / 2);

  const node = bounds
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", radius)
    .attr("fill", color)
    .attr("stroke", color)
    .attr("opacity", 0.5)
    // .call(drag(simulation))
    .on("mouseover.fade", fade(0.1))
    .on("mouseout.fade", fade(1));

  const textElems = bounds
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.id)
    .attr("opacity", 1)
    .attr("font-size", 8);
  // .call(drag(simulation))

  const textElems2 = bounds
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.id)
    .attr("opacity", 0)
    .attr("font-size", 8);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    node
      .attr("cx", function (d) {
        return (d.x = Math.max(
          radius + 1,
          Math.min(width - (radius + 1), d.x)
        ));
      })
      .attr("cy", function (d) {
        return (d.y = Math.max(
          radius + 1,
          Math.min(height - (radius + 1), d.y)
        ));
      });
    textElems
      .attr(
        "x",
        (d, i) =>
          d.x -
          d3
            .selectAll("text")
            .filter(function (d, j) {
              return i === j;
            })
            .node()
            .getComputedTextLength() /
            2
      )
      .attr("y", (d) => d.y + 3)
      .attr("opacity", 1)
      .attr("text-anchor", "start");

    textElems2
      .attr(
        "x",
        (d, i) =>
          d.x -
          d3
            .selectAll("text")
            .filter(function (d, j) {
              return i === j;
            })
            .node()
            .getComputedTextLength() /
            2
      )
      .attr("y", (d) => d.y + 3)
      .attr("opacity", 0)
      .attr("text-anchor", "start");
  });

  function fade(opacity) {
    return (e, d) => {
      node.style("opacity", function (o) {
        return isConnected(d, o) ? 0.6 : opacity;
      });
      textElems.style("visibility", function (o) {
        return isConnected(d, o) ? "visible" : "hidden";
      });
      link.style("stroke-opacity", (o) =>
        o.source === d || o.target === d ? 1 : opacity
      );
      if (opacity === 1) {
        node.style("opacity", 0.5);
        textElems.style("visibility", "visible");
        link.style("stroke-opacity", 0.3);
      }
    };
  }

  const linkedByIndex = {};
  links.forEach((d) => {
    linkedByIndex[`${d.source.index},${d.target.index}`] = 1;
  });

  function isConnected(a, b) {
    return (
      linkedByIndex[`${a.index},${b.index}`] ||
      linkedByIndex[`${b.index},${a.index}`] ||
      a.index === b.index
    );
  }

  let i = true;
  $(".btn").click(transition);

  function transition() {
    if (i) {
      simulation.stop();
      const { matrix, x, graph, opacity } = calcMatrix(data);
      const diff = x(1) - x(0);

      link.transition().duration(500).attr("opacity", 0);

      node
        .transition()
        .delay(1000)
        .duration(500)
        .style("opacity", 0)
        .attr("pointer-events", "none");

      textElems
        .transition()
        .delay(1000)
        .duration(500)
        .style("fill", (d) => color(d));

      textElems2
        .transition()
        .delay(1000)
        .duration(500)
        .attr("opacity", 1)
        .style("fill", (d) => color(d));

      textElems
        .transition()
        .delay(1500)
        .duration(1000)
        .attr("x", 2 * diff)
        .attr("y", (d, i) => (i + 3) * diff)
        .attr("text-anchor", "end");

      textElems2
        .transition()
        .delay(1500)
        .duration(1000)
        .attr("y", (d, i) => (i + 3) * diff)
        .attr("x", -2 * diff)
        .attr("transform", `rotate(-90)`)
        .attr("text-anchor", "start");

      var row = bounds
        .selectAll("g.row")
        .data(matrix)
        .enter()
        .append("g")
        .attr("class", "row")
        .attr("transform", function (d, i) {
          return `translate(${2.2 * diff}, ${x(i) + 2.2 * diff})`;
        })
        .each(function (d) {
          makeRow(d, this, x, graph, opacity);
        });

      $(".btn").html("Graph");
    }

    if (!i) {
      bounds
        .selectAll("g.row")
        .transition()
        .duration(1000)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .remove();

      textElems
        .transition()
        .delay(1500)
        .duration(1000)
        .attr(
          "x",
          (d, i) =>
            d.x -
            d3
              .selectAll("text")
              .filter(function (d, j) {
                return i === j;
              })
              .node()
              .getComputedTextLength() /
              2
        )
        .attr("y", (d) => d.y + 3)

        .style("fill", "#4c4c6d");

      textElems.transition().delay(2500).attr("text-anchor", "start");

      textElems2
        .transition()
        .delay(1500)
        .duration(1000)
        .attr(
          "x",
          (d, i) =>
            d.x -
            d3
              .selectAll("text")
              .filter(function (d, j) {
                return i === j;
              })
              .node()
              .getComputedTextLength() /
              2
        )
        .attr("y", (d) => d.y + 3)
        .attr("opacity", 0)
        .attr("transform", "rotate(0)");

      link.transition().delay(2500).duration(500).attr("opacity", 1);

      node
        .transition()
        .delay(2500)
        .duration(500)
        .style("opacity", 0.5)
        .attr("pointer-events", "all");

      $(".btn").html("Matrix");
    }

    i = !i;
  }

  function makeRow(rowData, that, x, graph, opacity) {
    var cell = d3
      .select(that)
      .selectAll("rect")
      .data(rowData)
      .enter()
      .append("rect")
      // .attr('class', 'cell')
      .attr("x", function (d, i) {
        return x(i);
      })
      .attr("width", x.bandwidth())
      .attr("height", x.bandwidth())
      .style("fill-opacity", 0)
      .on("mouseover", function (e, d) {
        textElems
          .filter(function (_, i) {
            return d.i === i;
          })
          .style("fill", "#d62333")
          .style("font-weight", "bold");
        textElems2
          .filter(function (_, j) {
            return d.j === j;
          })
          .style("fill", "#d62333")
          .style("font-weight", "bold");
      })
      .on("mouseout", function () {
        textElems.style("fill", (d) => color(d)).style("font-weight", null);
        textElems2.style("fill", (d) => color(d)).style("font-weight", null);
      });

    cell
      .transition()
      .delay(2500)
      .duration(500)
      .style("fill-opacity", function (d) {
        return opacity(d.val);
      })
      .style("fill", function (d) {
        if (d.val > 0 && graph.nodes[d.i].group === graph.nodes[d.j].group) {
          return color(graph.nodes[d.i]);
        } else if (d.val > 0) {
          return "#A7C4BC";
        } else {
          return null;
        }
      });

    cell.append("title").text(function (d) {
      return graph.nodes[d.i].id;
    });
  }

  // invalidation.then(() => simulation.stop());
}

function calcMatrix(data) {
  var graph = R.clone(data);

  var margin = {
    top: 70,
    right: 40,
    bottom: 40,
    left: 70,
  };
  const size = Math.min(window.innerHeight, window.innerWidth);
  var width = size - margin.left - margin.right;
  var height = size - margin.top - margin.bottom;

  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(10));
  var opacity = d3.scaleLinear().domain([0, 4]).range([0.25, 1]).clamp(true);
  var x = d3.scaleBand().rangeRound([0, width]).paddingInner(0.1).align(0);

  var idToNode = {};
  graph.nodes.forEach(function (n) {
    n.degree = 0;
    idToNode[n.id] = n;
  });

  graph.links.forEach(function (e) {
    // if(idToNode[e.source]){
    e.source = idToNode[e.source];
    e.target = idToNode[e.target];
    e.source.degree++;
    e.target.degree++;
    // }
  });
  graph.nodes.sort(function (a, b) {
    return b.group - a.group;
  });

  x.domain(d3.range(graph.nodes.length));
  opacity.domain([
    0,
    d3.max(graph.nodes, function (d) {
      return d.degree;
    }),
  ]);

  var matrix = graph.nodes.map(function (outer, i) {
    outer.index = i;
    return graph.nodes.map(function (inner, j) {
      return { i: i, j: j, val: i === j ? inner.degree : 0 };
    });
  });
  graph.links.forEach(function (l) {
    matrix[l.source.index][l.target.index].val += l.value;
    matrix[l.target.index][l.target.index].val += l.value;
    matrix[l.source.index][l.source.index].val += l.value;
    matrix[l.target.index][l.source.index].val += l.value;
  });

  return { matrix, x, graph, opacity, colorM: color };
}
