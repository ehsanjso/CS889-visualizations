import { count } from "d3";
import "./assets/scss/app.scss";

var $ = require("jquery");
var d3 = require("d3");
var R = require("ramda");

const label_dictionnary = {
  0: "T-shirt/top",
  1: "Trouser",
  2: "Pullover",
  3: "Dress",
  4: "Coat",
  5: "Sandal",
  6: "Shirt",
  7: "Sneaker",
  8: "Bag",
  9: "Ankle boot",
};

$(document).ready(function () {
  d3.json("/data/res.json").then(function (data) {
    // Your d3 drawing code comes here
    // The below example draws a simple "scatterplot"
    const pcaData = data.pca;
    const tsneData = data.tsne;
    const mdsData = data.mds;
    const labels = data.y;

    const res = {};

    labels.forEach((label, index) => {
      if (!res[label]) {
        res[label] = {};
      }
      const d = res[label];
      if (d.pca) {
        d.pca.count += 1;
        d.pca.x += pcaData[index][0];
        d.pca.y += pcaData[index][1];
        d.pca.label = label;
      } else {
        d.pca = {
          x: pcaData[index][0],
          y: pcaData[index][1],
          count: 1,
        };
      }

      if (d.tsne) {
        d.tsne.count += 1;
        d.tsne.x += tsneData[index][0];
        d.tsne.y += tsneData[index][1];
        d.tsne.label = label;
      } else {
        d.tsne = {
          x: tsneData[index][0],
          y: tsneData[index][1],
          count: 1,
        };
      }

      if (d.mds) {
        d.mds.count += 1;
        d.mds.x += mdsData[index][0];
        d.mds.y += mdsData[index][1];
        d.mds.label = label;
      } else {
        d.mds = {
          x: mdsData[index][0],
          y: mdsData[index][1],
          count: 1,
        };
      }
    });

    drawScatter(res, "pca");
    drawScatter(res, "tsne");
    drawScatter(res, "mds");
    drawLabels();
  });
});

function drawLabels() {
  // select the svg area
  var SVG = d3
    .select("#wrapper-text")
    .append("svg")
    .attr("width", 200)
    .attr("height", 400);

  // create a list of keys
  var keys = R.keys(label_dictionnary);

  // Usually you have a color scale in your chart already
  const color = d3
    .scaleSequential()
    .domain(d3.extent(keys))
    .interpolator((d) => d3.interpolateRainbow(-d));

  // Add one dot in the legend for each name.
  var size = 20;
  SVG.selectAll("mydots")
    .data(keys)
    .enter()
    .append("rect")
    .attr("x", 50)
    .attr("y", function (d, i) {
      return 100 + i * (size + 5);
    }) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("width", size)
    .attr("height", size)
    .style("fill", function (d) {
      return color(d);
    });

  // Add one dot in the legend for each name.
  SVG.selectAll("mylabels")
    .data(keys)
    .enter()
    .append("text")
    .attr("x", 50 + size * 1.2)
    .attr("y", function (d, i) {
      return 100 + i * (size + 5) + size / 2;
    }) // 100 is where the first dot appears. 25 is the distance between dots
    .style("fill", function (d) {
      return color(d);
    })
    .text(function (d) {
      return label_dictionnary[d];
    })
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");
}

function drawScatter(data, type) {
  // 1. Access data
  const avgData = R.map((el) => {
    const temp = el;
    temp.pca.xAvg = el.pca.x / el.pca.count;
    temp.pca.yAvg = el.pca.y / el.pca.count;

    temp.tsne.xAvg = el.tsne.x / el.tsne.count;
    temp.tsne.yAvg = el.tsne.y / el.tsne.count;

    temp.mds.xAvg = el.mds.x / el.mds.count;
    temp.mds.yAvg = el.mds.y / el.mds.count;

    return temp;
  }, data);
  console.log(avgData);

  const dataset = R.values(avgData);

  // set data constants
  const xAccessor = (d) => d[type].xAvg;
  const yAccessor = (d) => d[type].yAvg;
  const colorAccessor = (d) => d[type].label;

  // 2. Create chart dimensions

  const padding = 20;
  const width = window.innerWidth * 0.5 - padding * 2;
  const height = window.innerHeight * 0.5 - padding * 2;
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
    .select(`#wrapper-${type}`)
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  wrapper
    .append("text")
    .attr("class", "tilte-label")
    .attr("x", dimensions.boundedWidth / 2)
    .attr("y", 20)
    .html(type);

  const bounds = wrapper
    .append("g")
    .attr("class", "bounds")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  const boundsBackground = bounds
    .append("rect")
    .attr("class", "bounds-background")
    .attr("x", 0)
    .attr("width", dimensions.boundedWidth)
    .attr("y", 0)
    .attr("height", dimensions.boundedHeight);

  // 4. Create scales

  const rangeExtent = d3.extent([
    ...dataset.map(xAccessor),
    ...dataset.map(yAccessor),
  ]);
  const xScale = d3
    .scaleLinear()
    .domain(rangeExtent)
    .range([0, dimensions.boundedWidth])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain(rangeExtent)
    .range([dimensions.boundedHeight, 0])
    .nice();

  const colorScale = d3
    .scaleSequential()
    .domain(d3.extent([...dataset.map(colorAccessor)]))
    .interpolator((d) => d3.interpolateRainbow(-d));

  // 5. Draw data

  const dotsGroup = bounds.append("g");
  const dots = dotsGroup
    .selectAll(".dot")
    .data(dataset)
    .join("circle")
    .attr("class", (d) => `dot ${label_dictionnary[colorAccessor(d)]}`)
    .attr("cx", (d) => xScale(xAccessor(d)))
    .attr("cy", (d) => yScale(yAccessor(d)))
    .attr("r", 4)
    .style("fill", (d) => colorScale(colorAccessor(d)));

  // 6. Draw peripherals

  const xAxisGenerator = d3.axisBottom().scale(xScale).ticks(4);

  const xAxis = bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`);

  const xAxisLabel = xAxis
    .append("text")
    .attr("class", "x-axis-label")
    .attr("x", dimensions.boundedWidth / 2)
    .attr("y", dimensions.margin.bottom - 10)
    .html("First Principal Component");

  const yAxisGenerator = d3.axisLeft().scale(yScale).ticks(4);

  const yAxis = bounds.append("g").call(yAxisGenerator);

  const yAxisLabel = yAxis
    .append("text")
    .attr("class", "y-axis-label")
    .attr("x", -dimensions.boundedHeight / 2)
    .attr("y", -dimensions.margin.left + 10)
    .html("Second Principal Component");

  // 7. Set up interactions

  // create voronoi for tooltips
  const delaunayPoints = R.map(
    (el) => [xScale(xAccessor(el)), yScale(yAccessor(el))],
    dataset
  );
  const delaunay = d3.Delaunay.from(delaunayPoints);

  const voronoiData = delaunay.voronoi([
    0,
    0,
    dimensions.boundedWidth,
    dimensions.boundedHeight,
  ]);

  const voronoi = bounds
    .selectAll(".voronoi")
    .data(dataset)
    // .data(delaunayPoints.map((d, i) => voronoiData.renderCell(i)))
    .join("path")
    .style("pointer-events", "all")
    .attr("d", (d, i) => voronoiData.renderCell(i))
    .attr("class", "voronoi");

  voronoi
    .on("mouseenter", onVoronoiMouseEnter)
    .on("mouseleave", onVoronoiMouseLeave);

  function onVoronoiMouseEnter(event, voronoiDatum) {
    const pca = d3.select("#wrapper-pca");
    const tsne = d3.select("#wrapper-tsne");
    const mds = d3.select("#wrapper-mds");

    const tooltip = d3.select(`#tooltip-${type}`);

    const hoverElementsGroup_pca = pca
      .select(".bounds")
      .append("g")
      .attr("opacity", 0);
    const hoverElementsGroup_tsne = tsne
      .select(".bounds")
      .append("g")
      .attr("opacity", 0);
    const hoverElementsGroup_mds = mds
      .select(".bounds")
      .append("g")
      .attr("opacity", 0);

    // we'll use <rect>s instead of <line>s to take advantage of CSS transitions

    const dayDot_pca = hoverElementsGroup_pca
      .append("circle")
      .attr("class", "tooltip-dot");

    const dayDot_tsne = hoverElementsGroup_tsne
      .append("circle")
      .attr("class", "tooltip-dot");

    const dayDot_mds = hoverElementsGroup_mds
      .append("circle")
      .attr("class", "tooltip-dot");

    hoverElementsGroup_pca.style("opacity", 1);
    hoverElementsGroup_tsne.style("opacity", 1);
    hoverElementsGroup_mds.style("opacity", 1);

    const rangeExtent_pca = d3.extent([
      ...dataset.map((d) => d.pca.xAvg),
      ...dataset.map((d) => d.pca.yAvg),
    ]);
    const rangeExtent_tsne = d3.extent([
      ...dataset.map((d) => d.tsne.xAvg),
      ...dataset.map((d) => d.tsne.yAvg),
    ]);
    const rangeExtent_mds = d3.extent([
      ...dataset.map((d) => d.mds.xAvg),
      ...dataset.map((d) => d.mds.yAvg),
    ]);

    const xScale_pca = d3
      .scaleLinear()
      .domain(rangeExtent_pca)
      .range([0, dimensions.boundedWidth])
      .nice();

    const yScale_pca = d3
      .scaleLinear()
      .domain(rangeExtent_pca)
      .range([dimensions.boundedHeight, 0])
      .nice();

    const xScale_tsne = d3
      .scaleLinear()
      .domain(rangeExtent_tsne)
      .range([0, dimensions.boundedWidth])
      .nice();

    const yScale_tsne = d3
      .scaleLinear()
      .domain(rangeExtent_tsne)
      .range([dimensions.boundedHeight, 0])
      .nice();

    const xScale_mds = d3
      .scaleLinear()
      .domain(rangeExtent_mds)
      .range([0, dimensions.boundedWidth])
      .nice();

    const yScale_mds = d3
      .scaleLinear()
      .domain(rangeExtent_mds)
      .range([dimensions.boundedHeight, 0])
      .nice();

    const x_pca = xScale_pca(voronoiDatum.pca.xAvg);
    const y_pca = yScale_pca(voronoiDatum.pca.yAvg);
    const x_tsne = xScale_tsne(voronoiDatum.tsne.xAvg);
    const y_tsne = yScale_tsne(voronoiDatum.tsne.yAvg);
    const x_mds = xScale_mds(voronoiDatum.mds.xAvg);
    const y_mds = yScale_mds(voronoiDatum.mds.yAvg);

    const locations = {
      pca: { x: x_pca, y: y_pca },
      tsne: { x: x_tsne, y: y_tsne },
      mds: { x: x_mds, y: y_mds },
    };

    dayDot_pca
      .attr("cx", (d) => x_pca)
      .attr("cy", (d) => y_pca)
      .attr("r", 7);

    dayDot_tsne
      .attr("cx", (d) => x_tsne)
      .attr("cy", (d) => y_tsne)
      .attr("r", 7);

    dayDot_mds
      .attr("cx", (d) => x_mds)
      .attr("cy", (d) => y_mds)
      .attr("r", 7);

    tooltip
      .select("#max-temperature")
      .text(label_dictionnary[colorAccessor(voronoiDatum)]);

    const tooltipX = locations[type].x + dimensions.margin.left + padding;
    const tooltipY = locations[type].y + dimensions.margin.top + padding - 5; // bump up so it doesn't overlap with out hover circle

    tooltip.style(
      "transform",
      `translate(` +
        `calc( -50% + ${tooltipX}px),` +
        `calc(-100% + ${tooltipY}px)` +
        `)`
    );
    tooltip.style("opacity", 1);

    const color = colorScale(colorAccessor(voronoiDatum));

    //vertical line
    pca
      .select(".bounds")
      .append("line")
      .attr("class", "guide")
      .attr("x1", x_pca)
      .attr("x2", x_pca)
      .attr("y1", y_pca)
      .attr("y2", dimensions.boundedHeight)
      .style("stroke", color)
      .style("opacity", 0)
      .transition()
      .duration(200)
      .style("opacity", 0.5);
    //Value on the axis
    pca
      .select(".bounds")
      .append("text")
      .attr("class", "guide")
      .attr("x", x_pca)
      .attr("y", dimensions.boundedHeight + 20)
      .style("fill", color)
      .style("opacity", 0)
      .style("text-anchor", "middle")
      .text(d3.format(".2s")(xScale_pca.invert(x_pca)))
      .transition()
      .duration(200)
      .style("opacity", 0.5);

    //horizontal line
    pca
      .select(".bounds")
      .append("line")
      .attr("class", "guide")
      .attr("x1", x_pca)
      .attr("x2", 0)
      .attr("y1", y_pca)
      .attr("y2", y_pca)
      .style("stroke", color)
      .style("opacity", 0)
      .transition()
      .duration(200)
      .style("opacity", 0.5);
    //Value on the axis
    pca
      .select(".bounds")
      .append("text")
      .attr("class", "guide")
      .attr("x", -5)
      .attr("y", y_pca)
      .attr("dy", "0.35em")
      .style("fill", color)
      .style("opacity", 0)
      .style("text-anchor", "end")
      .text(d3.format(".2s")(yScale_pca.invert(y_pca)))
      .transition()
      .duration(200)
      .style("opacity", 0.5);

    //vertical line
    tsne
      .select(".bounds")
      .append("line")
      .attr("class", "guide")
      .attr("x1", x_tsne)
      .attr("x2", x_tsne)
      .attr("y1", y_tsne)
      .attr("y2", dimensions.boundedHeight)
      .style("stroke", color)
      .style("opacity", 0)
      .transition()
      .duration(200)
      .style("opacity", 0.5);
    //Value on the axis
    tsne
      .select(".bounds")
      .append("text")
      .attr("class", "guide")
      .attr("x", x_tsne)
      .attr("y", dimensions.boundedHeight + 20)
      .style("fill", color)
      .style("opacity", 0)
      .style("text-anchor", "middle")
      .text(d3.format(".2s")(xScale_tsne.invert(x_tsne)))
      .transition()
      .duration(200)
      .style("opacity", 0.5);

    //horizontal line
    tsne
      .select(".bounds")
      .append("line")
      .attr("class", "guide")
      .attr("x1", x_tsne)
      .attr("x2", 0)
      .attr("y1", y_tsne)
      .attr("y2", y_tsne)
      .style("stroke", color)
      .style("opacity", 0)
      .transition()
      .duration(200)
      .style("opacity", 0.5);
    //Value on the axis
    tsne
      .select(".bounds")
      .append("text")
      .attr("class", "guide")
      .attr("x", -5)
      .attr("y", y_tsne)
      .attr("dy", "0.35em")
      .style("fill", color)
      .style("opacity", 0)
      .style("text-anchor", "end")
      .text(d3.format(".2s")(yScale_tsne.invert(y_tsne)))
      .transition()
      .duration(200)
      .style("opacity", 0.5);

    //vertical line
    mds
      .select(".bounds")
      .append("line")
      .attr("class", "guide")
      .attr("x1", x_mds)
      .attr("x2", x_mds)
      .attr("y1", y_mds)
      .attr("y2", dimensions.boundedHeight)
      .style("stroke", color)
      .style("opacity", 0)
      .transition()
      .duration(200)
      .style("opacity", 0.5);
    //Value on the axis
    mds
      .select(".bounds")
      .append("text")
      .attr("class", "guide")
      .attr("x", x_mds)
      .attr("y", dimensions.boundedHeight + 20)
      .style("fill", color)
      .style("opacity", 0)
      .style("text-anchor", "middle")
      .text(d3.format(".2s")(xScale_mds.invert(x_mds)))
      .transition()
      .duration(200)
      .style("opacity", 0.5);

    //horizontal line
    mds
      .select(".bounds")
      .append("line")
      .attr("class", "guide")
      .attr("x1", x_mds)
      .attr("x2", 0)
      .attr("y1", y_mds)
      .attr("y2", y_mds)
      .style("stroke", color)
      .style("opacity", 0)
      .transition()
      .duration(200)
      .style("opacity", 0.5);
    //Value on the axis
    mds
      .select(".bounds")
      .append("text")
      .attr("class", "guide")
      .attr("x", -5)
      .attr("y", y_mds)
      .attr("dy", "0.35em")
      .style("fill", color)
      .style("opacity", 0)
      .style("text-anchor", "end")
      .text(d3.format(".2s")(yScale_mds.invert(y_mds)))
      .transition()
      .duration(200)
      .style("opacity", 0.5);
  }

  function onVoronoiMouseLeave() {
    d3.selectAll(".tooltip-dot").style("opacity", 0);
    d3.select(`#tooltip-${type}`).style("opacity", 0);
    //Fade out guide lines, then remove them
    d3.selectAll(".guide")
      .transition()
      .duration(200)
      .style("opacity", 0)
      .remove();
  }
}
