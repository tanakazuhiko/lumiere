/*
* timeline with zoom, pan and sort
* copyright 2019 tanakazuhiko
* powered by d3.js
*/
// variables
var directors_path = "../data/directors.json";
var films_path = "../data/films.json";
var from = "1870";
var to = "1950";
var zoom_from = 0.01;
var zoom_to = 10000;
var bar_y = 18;
var bar_width = 4;
var bar_height = 14;
var margin_y = 8;
var offset = 2;
var offset_x = 100;
var offset_y = 20;
var duration_sort = 1000;
var duration_reset = 2000;
var wait = 200;
var sort_type = "born";
var timer = 0;
var bg_image = "";
var copyright = "The Lumiere Brothers, Auguste and Louis, showing their invention to scientists (1895).";
var margin = {top: 0, right: 0, bottom: 40, left: 0};
var today = new Date();
var width, height;
var svg, rect, tooltip, zoom;
var e_sort, e_reset, e_copyright, e_count_d, e_count_f, e_headline, e_live, e_age;
var name, bar, born, died, film;
var x, y, xAxis, yAxis, gX, gY;
var directors, films;

// main
d3.json(directors_path).then(
    function(directors){
        d3.json(films_path).then(
            function(films){
                // init
                init(directors, films);
                // axis
                axis();
                // draw
                draw(directors, films);
                // sort
                sort(sort_type, films);
                // zoom
                init_zoom();

                // preload
                window.onload = function() {
                    // preload(directors, films);
                }
                // reset
                e_reset.onclick = function() {
                    sort("born", films);
                    resetted();
                }
                // sort
                e_sort.onchange = function() {
                    sort_type = this.options[this.selectedIndex].value;
                    sort(sort_type, films);
                }
            }
        );
    }
);

// init
function init(directors, films) {
    // window
    width = window.innerWidth - margin.left - margin.right;
    height = window.innerHeight - margin.top - margin.bottom;

    // element
    e_sort = document.getElementById("sort");
    e_reset = document.getElementById("reset");
    e_copyright = document.getElementById("copyright");
    e_count_d = document.getElementById("count_d");
    e_count_f = document.getElementById("count_f");
    e_headline = document.getElementById("headline");
    e_live = document.getElementById("live");
    e_age = document.getElementById("age");

    // count
    var from = 0;
    var random = Math.round(Math.random() * directors.length);
    var lavel = directors[random].died ? "aged" : "age";
    var age = directors[random].died ? directors[random].aged : calcAge(directors[random].born, today);

    document.title = directors.length + " cinéastes et leurs " + films.length + " œuvres";
    document.body.style.backgroundImage = "url('../images/directors/" + directors[random].id + ".png')";
    e_copyright.innerHTML = directors[random].copyright ? directors[random].copyright : "unknown";
    e_live.innerHTML = directors[random].born + " - " + directors[random].died;
    e_age.innerHTML = " (" + lavel + ":" + age + ")";

    var duration = 2;
    var obj = { count: from };
    TweenMax.to(obj, duration, {
        count: directors.length,
        ease: Power3.easeInOut,
        onUpdate: () => {
            var count = Math.floor(obj.count);
            e_count_d.textContent = count;
            if(count > 0)
                e_headline.textContent = "::" + directors[count - 1].name;
        },
        onComplete : () => {
            e_headline.innerHTML = "::" + directors[random].name;
        },
    });

    var duration2 = 2;
    var obj2 = { count: from };
    TweenMax.to(obj2, duration2, {
        count: films.length,
        ease: Power3.easeInOut,
        onUpdate: () => {
            e_count_f.textContent = Math.floor(obj2.count);
        }
    });

    // svg
    svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

    // rect
    rect = svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "rect")
    .attr("id", "rect")

    // tooltip
    tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip");
}

// axis
function axis() {
    // x
    x = d3
    .scaleTime()
    .domain([formatDate(from), formatDate(to)])
    .range([0, width]);

    xAxis = d3
    .axisBottom(x)
    .tickSize(height)
    .tickPadding(margin_y - height);

    gX = svg
    .append("g")
    .attr("class", "gx")
    .call(xAxis);

    // y
    y = d3
    .scaleLinear()
    .domain([0, height])
    .range([0, height]);

    yAxis = d3
    .axisRight(y)
    .tickSize(width)
    .tickPadding(margin_y - width);

    gY = svg
    .append("g")
    .attr("class", "gy")
    .call(yAxis);
}

// draw
function draw(directors, films) {
    // name
    name = svg
    .selectAll(".name")
    .data(directors)
    .enter()
    .append("text")
    .attr("class", "name")
    .attr("x", function(d) { return x(formatDate(d.born)) - 4; })
    .attr("y", function(d, i) { return bar_y * (i + offset) + bar_height; })
    .text(function(d) { return d.name; });

    // bar
    bar = svg
    .selectAll(".bar")
    .data(directors)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(formatDate(d.born)); })
    .attr("y", function(d, i) { return bar_y * (i + offset); })
    .attr("width", function(d) {
        var died = d.died ? d.died : today;
        return x(formatDate(died)) - x(formatDate(d.born));
    })
    .attr("height", function(d) { return bar_height; })
    .on("mouseover", function(d) { changeBg(d); });

    // born
    born = svg
    .selectAll(".born")
    .data(directors)
    .enter()
    .append("rect")
    .attr("class", "born")
    .attr("x", function(d) { return x(formatDate(d.born)); })
    .attr("y", function(d, i) { return bar_y * (i + offset); })
    .attr("width", function(d) { return bar_width; })
    .attr("height", function(d) { return bar_height; })
    .on("mouseover", function(d) {
        tooltip
        .style("visibility", "visible")
        .html(setBorn(d));
    })
    .on("mousemove", function(d) {
        tooltip
        .style("top", (d3.event.pageY + 20) + "px")
        .style("left", (d3.event.pageX - 100) + "px");
    })
    .on("mouseout", function(d) {
        tooltip
        .style("visibility", "hidden");
    });

    // died
    died = svg
    .selectAll(".died")
    .data(directors)
    .enter()
    .append("rect")
    .attr("class", "died")
    .attr("x", function(d) {
        var died = d.died ? d.died : today;
        return x(formatDate(died));
    })
    .attr("y", function(d, i) { return bar_y * (i + offset); })
    .attr("width", function(d) { return bar_width; })
    .attr("height", function(d) { return bar_height; })
    .on("mouseover", function(d) {
        tooltip
        .style("visibility", "visible")
        .html(setBorn(d));
    })
    .on("mousemove", function(d) {
        tooltip
        .style("top", (d3.event.pageY + offset_y) + "px")
        .style("left", (d3.event.pageX - offset_x) + "px");
    })
    .on("mouseout", function(d) {
        tooltip
        .style("visibility", "hidden");
    });

    // film
    film = svg
    .selectAll(".film")
    .data(films)
    .enter()
    .append("rect")
    .attr("class", function(d) { return "film " + d.director_id; })
    .attr("id", function(d) { return d.director_id + "_" + d.no; })
    .attr("x", function(d) { return x(formatDate(d.year)); })
    .attr("y", function(d, i) { return getY(d, directors); })
    .attr("width", function(d) { return bar_width; })
    .attr("height", function(d) { return bar_height; })
    .on("mouseover", function(d) {
        tooltip
        .style("visibility", "visible")
        .html(setFilm(directors, d));
    })
    .on("mousemove", function(d) {
        tooltip
        .style("top", (d3.event.pageY + offset_y) + "px")
        .style("left", (d3.event.pageX - offset_x) + "px");
    })
    .on("mouseout", function(d) {
        tooltip
        .style("visibility", "hidden");
    });
}

// sort
function sort(sort_type, films) {
    // name
    d3.selectAll(".name")
    .sort(compareValues(sort_type))
    .transition()
    .duration(duration_sort)
    .attr("y", function(d, i) { return bar_y * (i + offset) + bar_height; });

    // bar
    d3.selectAll(".bar")
    .sort(compareValues(sort_type))
    .transition()
    .duration(duration_sort)
    .attr("y", function(d, i) { return bar_y * (i + offset); });

    // born
    d3.selectAll(".born")
    .sort(compareValues(sort_type))
    .transition()
    .duration(duration_sort)
    .attr("y", function(d, i) { return bar_y * (i + offset); });

    // died
    d3.selectAll(".died")
    .sort(compareValues(sort_type))
    .transition()
    .duration(duration_sort)
    .attr("y", function(d, i) {
        var id = (d && d.id) ? d.id : "";
        var y = bar_y * (i + offset);
        // film
        films.filter(function(item, index){
            if(item.director_id == id) {
                d3.selectAll("." + id)
                .transition()
                .duration(duration_sort)
                .attr("y", y);
            }
        });
        return y;
    });
}

// init_zoom
function init_zoom() {
    zoom = d3
    .zoom()
    .scaleExtent([zoom_from, zoom_to])
    .on("zoom", zoomed);

    svg.call(zoom);
}

// preload
function preload(directors, films) {
    for (i = 0; i < directors.length; i++){
        var img = document.createElement('img');
        img.src = "../images/directors/" + directors[i].id + ".png";
    }
    for (i = 0; i < films.length; i++){
        var img = document.createElement('img');
        img.src = "../images/films/" + films[i].director_id + "/" + films[i].no + ".png";
    }
}

// zoom
function zoomed() {
    gX.call(xAxis.scale(d3.event.transform.rescaleX(x)));
    gY.call(yAxis.scale(d3.event.transform.rescaleY(y)));
    bar.attr("transform", d3.event.transform);
    svg.selectAll(".name").attr("transform", d3.event.transform);
    svg.selectAll(".born").attr("transform", d3.event.transform);
    svg.selectAll(".died").attr("transform", d3.event.transform);
    svg.selectAll(".film").attr("transform", d3.event.transform);
}

// reset
function resetted() {
    svg
    .transition()
    .duration(duration_reset)
    .call(zoom.transform, d3.zoomIdentity);

    document.body.style.backgroundImage = "";
    e_headline.innerHTML = "";
    e_live.innerHTML = "";
    e_age.innerHTML = "";
    e_copyright.innerHTML = "";
    e_sort.options[1].selected = true;
}

// background
function changeBg(director) {
    // backgroundImage
    var path = "../images/directors/" + director.id + ".png";
    document.body.style.backgroundImage = "url('" + path + "')";

    // copyright
    var str = director.copyright ? director.copyright : "unknown";
    e_copyright.innerHTML = str;

    // name
    var str = director.name + "(" + director.born + "〜" + director.died + ")";
    var lavel = director.died ? "aged" : "age";
    var age = director.died ? director.aged : calcAge(director.born, today);
    e_headline.innerHTML = "::" + director.name;
    e_live.innerHTML = director.born + " - " + director.died;
    e_age.innerHTML = " (" + lavel + ":" + age + ")";
}

// tooltip born
function setBorn(d) {
    var str = "";
    str += "<img class='tooltip_img' src='../images/directors/" + d.id + ".png'>";
    var add = d.name_jp.length >= 10 ? "small" : "";
    str += "<div class='tooltip_name_jp " + add + "'>" + d.name_jp + "</div>";
    str += "<div class='tooltip_name'>" + d.name + "</div>";
    str += "<div class='tooltip_born'>" + d.born + " 〜 " + d.died;
    var age = d.died ? d.aged : calcAge(d.born, today);
    var lavel = d.died ? "aged" : "age";
    str += "<span> (" + lavel + ":" + age + ")</span></div>";
    str += "<div class='tooltip_place'>" + d.born_at + " / " + d.died_at + "</div>";
    return str;
}

// tooltip film
function setFilm(directors, film) {
    var str = "";
    var add = "";
    str += "<img class='tooltip_img' src='../images/films/" + film.director_id + "/" + film.no + ".png'>";
    add = film.title_jp.length >= 12 ? "small" : "";
    str += "<div class='tooltip_title_jp " + add + "'>" + film.title_jp + "</div>";
    add = film.title.length >= 25 ? "small" : "";
    str += "<div class='tooltip_title " + add + "'>" + film.title + "</div>";
    var born = getBorn(directors, film.director_id);
    var age = calcAge(born, film.year);
    str += "<div class='tooltip_year'>" + film.year.substr(0, 4) + " (age:" + age+ ")" + "</div>";
    return str;
}

// compare
function compareValues(key, order='asc') {
    return function(a, b) {
        if((!a || !b) || (!a.hasOwnProperty(key) || !b.hasOwnProperty(key))) {
            return 0;
        }
        const varA = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
        const varB = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];
        var comparison = 0;
        if (varA > varB) {
            comparison = 1;
        } else if (varA < varB) {
            comparison = -1;
        }
        return (
            (order == 'desc') ? (comparison * -1) : comparison
        );
    };
}

// getY
function getY(d, directors) {
    var y = 0;
    directors.filter(function(item, index){
        if(item.id == d.director_id) {
            y = index;
        }
    });
    return bar_y * (y + 2);
}

// formatDate
function formatDate(date) {
    return new Date(date);
}

// age
function calcAge(from, to) {
    from = formatDate(from);
    to = formatDate(to);
    d1 = to.getFullYear() * 10000 + (to.getMonth() + 1) * 100 + to.getDate();
    d2 = from.getFullYear() * 10000 + (from.getMonth() + 1) * 100 + from.getDate();
    return (Math.floor((d1 - d2) / 10000));
}

// born
function getBorn(directors, id) {
    var born = 0;
    directors.filter(function(item, index){
        if(item.id == id) {
            born = item.born;
        }
    });
    return born;
}
