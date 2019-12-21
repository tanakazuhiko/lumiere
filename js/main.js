/*
* timeline with zoom, pan and sort
* copyright 2019 tanakazuhiko
* powered by d3.js
*/
// variables
var directors_path = "../data/directors.json";
var films_path = "../data/films.json";
var directors_img_path = "../images/directors/";
var films_img_path = "../images/films/";
var png_ext = ".png";
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
var map_color = "#666464";
var sort_type = "";
var timer = 0;
var bg_image = "";
var copyright = "The Lumiere Brothers, Auguste and Louis, showing their invention to scientists (1895).";
var margin = { top: 0, right: 0, bottom: 40, left: 0 };
var today = new Date();
var width, height;
var svg, rect, tooltip, zoom, zoom_map, g, g_map, g_area, g_name;
var e_sort, e_reset, e_copyright, e_count_d, e_count_f, e_headline, e_live, e_age, e_map, e_powered;
var name, bar, born, died, film;
var x, y, xAxis, yAxis, gX, gY;
var directors, films;
var area_count = [];

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
                sort_type = "name";
                sort(sort_type, directors, films);
                // zoom
                initZoom();
                // re sort
                sort_type = "born";
                sort(sort_type, directors, films);
                // reset
                resetted();
                // sort
                e_sort.onchange = function() {
                    sort_type = this.options[this.selectedIndex].value;
                    if(sort_type == "born_at") {
                        e_map.classList.add("active");
                        e_copyright.style.opacity = 0;
                        e_powered.textContent = "Google Map API";
                        e_powered.href = "https://cloud.google.com/maps-platform/";
                        // init map
                        init_map(directors);
                    } else {
                        e_map.classList.remove("active");
                        e_copyright.style.opacity = 1;
                        e_powered.textContent = "d3.js";
                        e_powered.href = "https://d3js.org/";
                        // sort
                        sort(sort_type, directors, films);
                    }
                }
                // reset
                e_reset.onclick = function() {
                    e_map.classList.remove("active");
                    e_copyright.style.opacity = 1;
                    e_powered.textContent = "d3.js";
                    e_powered.href = "https://d3js.org/";
                    document.body.style.backgroundImage = "";

                    sort_type = "born";
                    sort(sort_type, directors, films);
                    resetted();
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
    e_powered = document.getElementById("powered");
    e_copyright = document.getElementById("copyright");
    e_count_d = d3.select("#count_d");
    e_count_f = d3.select("#count_f");
    e_headline = document.getElementById("headline");
    e_live = document.getElementById("live");
    e_age = document.getElementById("age");
    e_map = document.getElementById("map");
    e_map.style.height = window.innerHeight + "px";

    // count
    var from = 0;
    var random = Math.round(Math.random() * directors.length);
    var lavel = directors[random].died ? "aged" : "age";
    var age = directors[random].died ? directors[random].aged : calcAge(directors[random].born, today);
    document.title = directors.length + " cinéastes et leurs " + films.length + " œuvres";
    document.body.style.backgroundImage = "url('" + directors_img_path + directors[random].id + png_ext + "')";

    e_count_d
    .transition()
    .duration(duration_reset)
    .tween("text", function(d) {
        var selection = d3.select(this);
        var interpolator = d3.interpolateNumber(0, directors.length);
        return function(t) {
            var no = Math.round(interpolator(t));
            if(no > 0) {
                var age = directors[no-1].died ? directors[no-1].aged : calcAge(directors[no-1].born, today);
                e_headline.textContent = "::" + directors[no-1].name;
                e_live.innerHTML = directors[no-1].born + " - " + directors[no-1].died;
                e_age.innerHTML = " (aged:" + age + ")";
            }
            selection.text(no);
        };
    })
    .on("end", function(d) {
        e_headline.innerHTML = "::" + directors[random].name;
        e_live.innerHTML = directors[random].born + " - " + directors[random].died;
        e_age.innerHTML = " (" + lavel + ":" + age + ")";
        e_copyright.innerHTML = directors[random].copyright ? directors[random].copyright : "unknown";
        d3.select("#bar_" + directors[random].id).style("fill", "brown");
    });

    e_count_f
    .transition()
    .duration(duration_reset)
    .tween("text", function(d) {
        var selection = d3.select(this);
        var interpolator = d3.interpolateNumber(0, films.length);
        return function(t) { selection.text(Math.round(interpolator(t))); };
    });

    // svg
    svg = d3
    .select("body")
    .append("svg")
    .attr("class", "svg_main")
    .attr("width", width)
    .attr("height", height);

    // rect
    rect = svg
    .append("rect")
    .attr("class", "rect")
    .attr("id", "rect")
    .attr("width", width)
    .attr("height", height);

    // tooltip
    tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip");
}

// init map
function init_map(directors) {
    var p_zoom = 3.6;
    var p_lat = 44.918669;
    var p_lng = -36.905313;
    var p_type = "hybrid";
    var latLng, lat, lng, marker, infowindow;
    var inforObj = [];
    var current_name = e_headline.textContent.substr(2);
    // map
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: p_zoom,
        center: new google.maps.LatLng(p_lat, p_lng),
        mapTypeId: p_type,
        mapTypeControl: false,
        fullscreenControl: false,
    });
    // directors
    directors.forEach(function(director, index, arr) {
        if(!area_count[director.born_at]) {
            area_count[director.born_at] = 1;
        } else {
            area_count[director.born_at] += 1;
        }
        lat = director.lat;
        lng = director.lng + (area_count[director.born_at]-1) * 0.3;
        // maker
        marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            map: map
        });
        // listener
        google.maps.event.addListener(marker, "mouseover",
            function(event){
                setDirector(directors[index]);
                closeOtherInfo();
                infowindow = new google.maps.InfoWindow({
                    content: setBorn(directors[index])
                });
                infowindow.open(map, marker);
                infowindow.setPosition(event.latLng);
                inforObj[0] = infowindow;
            }
        );
        // current
        if(director.name == current_name) {
            infowindow = new google.maps.InfoWindow({
                content: setBorn(directors[index])
            });
            infowindow.open(map, marker);
            infowindow.setPosition(event.latLng);
            inforObj[0] = infowindow;
        }
    });
    // closeOtherInfo
    function closeOtherInfo() {
        if(inforObj.length > 0) {
            inforObj[0].set("marker", null);
            inforObj[0].close();
            inforObj.length = 0;
        }
    }
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
    var g_name = svg.append("g").attr("class", "g_name");
    var g_bar = svg.append("g").attr("class", "g_bar");
    var g_born = svg.append("g").attr("class", "g_born");
    var g_died = svg.append("g").attr("class", "g_died");
    var g_film = svg.append("g").attr("class", "g_film");

    // name
    name = g_name
    .selectAll(".name")
    .data(directors)
    .enter()
    .append("text")
    .attr("class", "name")
    .attr("x", function(d) { return x(formatDate(d.born)) - 4; })
    .attr("y", function(d, i) { return bar_y * (i + offset) + bar_height; })
    .text(function(d) { return d.name; });

    // bar
    bar = g_bar
    .selectAll(".bar")
    .data(directors)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("id", function(d) { return "bar_" + d.id; })
    .attr("x", function(d) { return x(formatDate(d.born)); })
    .attr("y", function(d, i) { return bar_y * (i + offset); })
    .attr("width", function(d) {
        var died = d.died ? d.died : today;
        return x(formatDate(died)) - x(formatDate(d.born));
    })
    .attr("height", function(d) { return bar_height; })
    .on("mouseover", function(d) { setDirector(d); });

    // born
    born = g_born
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
    died = g_died
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
    film = g_film
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
function sort(sort_type, directors, films) {
    // name
    d3.selectAll(".name")
    .sort(compareValues(sort_type))
    .transition()
    .duration(duration_sort)
    .attr("x", function(d, i) {
        if(sort_type == "id") {
            return 120;
        } else if(sort_type == "aged") {
            return 126;
        } else {
            return x(formatDate(d.born)) - 4;
        }
    })
    .attr("y", function(d, i) { return bar_y * (i + offset) + bar_height; })
    .text(function(d, i) {
        if(sort_type == "id") {
            var num = d.name.lastIndexOf(" ");
            if(d.id == "straub-huillet")
            return d.name + ", S";
            else
            return d.name + ", " + d.name.substr(num, 2);
        } else if(sort_type == "aged") {
            var age = d.died ? d.aged : calcAge(d.born, today);
            return d.name + ", " + age;
        } else if(sort_type == "born_at") {
            return d.name + ", " + d.born_at;
        } else {
            return d.name;
        }
    })

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

// initZoom
function initZoom() {
    zoom = d3
    .zoom()
    .scaleExtent([zoom_from, zoom_to])
    .on("zoom", zoomed)

    svg.call(zoom);

    var zoom2 = d3
    .zoomIdentity
    .translate(width / 2, height / 2)
    .scale(50)
    .translate(-1000, -500);

    svg.call(zoom.transform, zoom2);
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

    e_headline.innerHTML = "";
    e_live.innerHTML = "";
    e_age.innerHTML = "";
    e_copyright.innerHTML = "";
    e_sort.options[2].selected = true;
    d3.selectAll(".bar").style("fill", "white");
}

// background
function setDirector(director) {
    // backgroundImage
    var path = directors_img_path + director.id + png_ext;
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

    // bar
    d3.selectAll(".bar").style("fill", "white");
    d3.select("#bar_" + director.id).style("fill", "brown");
}

// tooltip born
function setBorn(d) {
    var str = "";
    str += "<img class='tooltip_img' src='" + directors_img_path + d.id + png_ext + "'>";
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
    var youtube_url = "https://www.youtube.com/embed/";
    var option = "?autoplay=1&rel=0&modestbranding=1&loop=1";
    if(film.movie) {
        str += "<iframe width=300 height=218 src='" + youtube_url + film.movie + option + "' frameborder=0 allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'></iframe>";
    } else {
        str += "<img class='tooltip_img' src='" + films_img_path + film.director_id + "/" + film.no + png_ext + "'>";
    }
    add = film.title_jp.length >= 15 ? "xsmall" : film.title_jp.length >= 12 ? "small" : "";
    str += "<div class='tooltip_title_jp " + add + "'>" + film.title_jp + "</div>";
    add = film.title.length >= 25 ? "small" : "";
    str += "<div class='tooltip_title " + add + "'>" + film.title + "</div>";
    var born = getBorn(directors, film.director_id);
    var age = calcAge(born, film.year);
    str += "<div class='tooltip_year'>" + film.year.substr(0, 4) + " (age:" + age+ ")" + "</div>";
    return str;
}

// compare
function compareValues(key, order="asc") {
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

// preload
function preload(directors, films) {
    for (i = 0; i < directors.length; i++){
        var img = document.createElement('img');
        img.src = directors_img_path + directors[i].id + png_ext;
    }
    for (i = 0; i < films.length; i++){
        var img = document.createElement('img');
        img.src = films_img_path + films[i].director_id + "/" + films[i].no + png_ext;
    }
}
