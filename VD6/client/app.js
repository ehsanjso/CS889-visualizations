import { color, count } from "d3";
import "./assets/scss/app.scss";

var $ = require("jquery");
var d3 = require("d3");
var R = require("ramda");

let isOpen = false;

$(".btn").on("click", () => {
  isOpen = !isOpen;
  $("#wrapper-text").css("opacity", isOpen ? "1" : "0");
  $("#wrapper-text").css("z-index", isOpen ? "2" : "0");
  $(".btn").html(isOpen ? "Close" : "Info");
});

$(document).ready(function () {
  d3.csv("/data/SOTU topics.csv").then(function (data) {
    const filteredData = R.filter(
      (el) => parseInt(el.year) > 1988 && parseInt(el.year) < 2017,
      data
    );
    const resData = R.groupBy(R.prop("year"), filteredData);
    const finalData = R.map((el) => el[0], resData);
    getJSON(finalData);
  });

  function getJSON(metaData) {
    d3.json("/data/data.json").then(function (data) {
      // console.log(data);
      const newData = [];
      for (let year in data) {
        for (let topic in data[year]) {
          for (let word in data[year][topic])
            newData.push({
              ...data[year][topic][word],
              p: parseFloat(data[year][topic][word].p),
              word,
              ...metaData[year],
              year,
              topic,
            });
        }
      }
      console.log(newData);
      drawVis(newData, metaData);
    });
  }

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

function drawVis(data, metaData) {
  let clicked = false;

  const margin = { top: 25, right: 100, bottom: 35, left: 50 };
  const height = window.innerHeight;
  const width = window.innerWidth;

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.topic))
    .nice()
    .range([height - margin.bottom, margin.top]);

  const y_word = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.word))
    .nice()
    .range([0, Math.abs(y(1) - y(0)) * 0.4]);

  const size = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.p))
    .nice()
    .range([8, 26]);

  const groupSimilarWords = R.groupBy(R.prop("keyword"), data);
  const linkedData = R.filter((el) => el.length > 1, groupSimilarWords);

  const color = d3.scaleOrdinal([
    "#4e79a7",
    "#f28e2c",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc949",
    "#af7aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ab",
  ]);

  const colorParty = d3.scaleOrdinal(["#FF0000", "#0015BC"]);

  const svg = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .on("click", onMouseLeave);

  svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("text-anchor", "middle")
    .selectAll(".words")
    .data(data)
    .join("text")
    .attr("dy", "0.35em")
    .attr("x", (d) => x(d.year))
    .attr(
      "y",
      (d) =>
        y(d.topic) +
        y_word(d.word) -
        (4 - parseInt(d.topic)) * Math.abs(y(1) - y(0)) * 0.3
    )
    .attr("font-size", (d) => `${size(d.p)}px`)
    .style("fill", (d) => color(d.topic))
    .text((d) => d.keyword)
    .attr("class", (d) => `word ${d.keyword}`)
    .on("click", onMouseClick)
    .on("mouseover", onMouseEnter)
    .on("mouseout", onMouseLeave2);

  const xAxis = svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom - 50})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickFormat((d) => d)
    )
    .call((g) => g.select(".domain").remove());

  xAxis
    .selectAll("text")
    .attr("fill", function (d) {
      return colorParty(metaData[d].party);
    })
    .attr("font-size", "12px");
  xAxis.selectAll("line").attr("stroke", function (d) {
    return colorParty(metaData[d].party);
  });

  const flatMetaData = R.values(metaData);

  svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("text-anchor", "middle")
    .selectAll(".president")
    .data(flatMetaData)
    .join("text")
    .attr("dy", "0.35em")
    .attr("x", (d) => x(d.year))
    .attr("y", height - margin.bottom - 10 - 50)
    .attr("font-size", "10px")
    .style("fill", (d) => colorParty(d.party))
    .text((d, i) => {
      if (i > 0 && i < flatMetaData.length - 1) {
        if (
          d.president !== flatMetaData[i - 1].president ||
          d.president !== flatMetaData[i + 1].president
        ) {
          return d.president;
        }
        return "...";
      }
      return d.president;
    });

  var imgs = svg.selectAll("image").data(flatMetaData);
  imgs
    .enter()
    .append("svg:image")
    .attr("x", (d) => x(d.year) - 12)
    .attr("y", height - margin.bottom - 10 - 12)
    .attr("width", 24)
    .attr("height", 24)
    .attr("xlink:href", (d) =>
      d.party === "Republican" ? "data/republican.png" : "data/democrat.png"
    );

  for (let link in linkedData) {
    svg
      .append("g")
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle")
      .selectAll(`${link}`)
      .data(linkedData[link])
      .join("path")
      .attr("d", (d, i) => {
        if (i < linkedData[link].length - 1) {
          return d3.line()([
            [
              x(d.year),
              y(d.topic) +
                y_word(d.word) -
                (4 - parseInt(d.topic)) * Math.abs(y(1) - y(0)) * 0.3,
            ],
            [
              x(linkedData[link][i + 1].year),
              y(linkedData[link][i + 1].topic) +
                y_word(linkedData[link][i + 1].word) -
                (4 - parseInt(linkedData[link][i + 1].topic)) *
                  Math.abs(y(1) - y(0)) *
                  0.3,
            ],
          ]);
        }
      })
      .attr("class", (d) => `link link-${d.keyword}`)
      .style("stroke", "#8785A2")
      .style("fill", "none")
      .style("opacity", 0)
      .style("stroke-width", 1);
  }

  function onMouseClick(event, d) {
    clicked = !clicked;
    event.stopPropagation();

    d3.selectAll(`.link-${d.keyword}`).style("opacity", 0.5);
    d3.selectAll(`.word`).style("opacity", (data) =>
      data.keyword === d.keyword ? 1 : 0.2
    );
  }

  function onMouseEnter(event, d) {
    event.stopPropagation();
    if (!clicked) {
      d3.selectAll(`.link-${d.keyword}`).style("opacity", 0.5);
      d3.selectAll(`.word`).style("opacity", (data) =>
        data.keyword === d.keyword ? 1 : 0.2
      );
    }
  }

  function onMouseLeave(event, d) {
    if (clicked) {
      d3.selectAll(`.link`).style("opacity", 0);
      d3.selectAll(`.word`).style("opacity", 1);
    }
  }

  function onMouseLeave2(event, d) {
    if (!clicked) {
      d3.selectAll(`.link`).style("opacity", 0);
      d3.selectAll(`.word`).style("opacity", 1);
    }
  }
}
