// Global variable to hold event data
let eventsData = [];
let map;
let markers = [];

// Debounce function to limit how often a function is called
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Debounced logging function (500ms delay)
const debouncedLogEvent = debounce((eventType, eventDetails) => {
    gtag('event', eventType, {
        eventDetails: JSON.stringify(eventDetails),
    });
}, 500); // Adjust the delay as needed

// Function to log hyperlink clicks
function logLinkClick(event) {
    event.preventDefault(); // Prevent the default link behavior
    const linkUrl = event.currentTarget.href; // Get the link URL
    const linkText = event.currentTarget.textContent; // Get the link text

    // Log the link click event
    debouncedLogEvent("link_click", {
        linkUrl,
        linkText,
        linkType: event.currentTarget.classList.contains("event_link") ? "event_link" : "maps_link",
    });

    // Open the link in a new tab after logging
    window.open(linkUrl, "_blank");
}

// Add event listeners to all hyperlinks
function addLinkClickListeners() {
    const eventLinks = document.querySelectorAll("a.event_link");
    const mapsLinks = document.querySelectorAll("a.maps_link");

    // Add listeners to event links
    eventLinks.forEach(link => {
        link.addEventListener("click", logLinkClick);
    });

    // Add listeners to location links
    mapsLinks.forEach(link => {
        link.addEventListener("click", logLinkClick);
    });
}

// Initialize the map
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: { lat: -37.8136, lng: 144.9631 }, // Melbourne as default center
    });
    loadEventData();
}

// Load event data from CSV
function loadEventData() {
    Papa.parse("event_table.csv", {
        download: true,
        header: true,
        complete: function (results) {
            eventsData = results.data;
            populateTable(eventsData);
            populateMap(eventsData);
        },
        error: function (error) {
            console.error("Error loading event CSV:", error);
            debouncedLogEvent("error", { message: "Failed to load event data", error: error.message });
        },
    });
}

// Log tab switching
function showTab(tabId, contentId) {
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.remove("active"));

    const tabs = document.querySelectorAll(".tab-button");
    tabs.forEach(tab => tab.classList.remove("active"));

    document.getElementById(contentId).classList.add("active");
    document.getElementById(tabId).classList.add("active");

    debouncedLogEvent("tab_switch", { tab: tabId });

    if (tabId === "table-tab") {
        populateTable(eventsData);
    }
}

// Log search button press
function searchButtonPressed() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const inputAddress = document.getElementById("address").value;
    const radius = parseFloat(document.getElementById("radius").value);
    const searchText = document.getElementById("searchText").value;

    debouncedLogEvent("search_button", {
        startDate,
        endDate,
        inputAddress,
        radius,
        searchText,
    });

    // If both date range and radius filtering are needed
    if ((startDate || endDate) && (inputAddress || !isNaN(radius))) {
        geocodeAddress(inputAddress, (userLat, userLon) => {
            let filteredData = applyDateRangeFilter(eventsData, startDate, endDate);
            filteredData = applyRadiusFilter(filteredData, userLat, userLon, radius);
            filteredData = applyTextSearch(filteredData, searchText); // Apply text search filter
            populateTable(filteredData);
            populateMap(filteredData);
        });
    } else if (startDate || endDate) {
        // Only date range filtering
        let filteredData = applyDateRangeFilter(eventsData, startDate, endDate);
        filteredData = applyTextSearch(filteredData, searchText); // Apply text search filter
        populateTable(filteredData);
        populateMap(filteredData);
    } else if (inputAddress || !isNaN(radius)) {
        // Only radius filtering
        geocodeAddress(inputAddress, (userLat, userLon) => {
            let filteredData = applyRadiusFilter(eventsData, userLat, userLon, radius);
            filteredData = applyTextSearch(filteredData, searchText); // Apply text search filter
            populateTable(filteredData);
            populateMap(filteredData);
        });
    } else {
        // If no valid criteria, apply text search to all events
        const filteredData = applyTextSearch(eventsData, searchText);
        populateTable(filteredData);
        populateMap(filteredData);
    }
}

// Log text search
function handleSearchInput(event) {
    const searchText = event.target.value;

    const filteredData = applyTextSearch(eventsData, searchText);
    populateTable(filteredData);
    populateMap(filteredData);

    debouncedLogEvent("text_search", { searchText });
}

// Log date filtering
function applyDateRangeFilter(data, startDate, endDate) {
    if (!startDate || !endDate) {
        alert("Please select both a start and an end date.");
        return data;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    debouncedLogEvent("date_filter", { startDate, endDate });

    return data.filter(event => {
        const eventDate = new Date(event.Date);
        return eventDate >= start && eventDate <= end;
    });
}

// Log location filtering
function applyRadiusFilter(data, userLat, userLon, radius) {
    if (!userLat || !userLon || isNaN(radius)) {
        alert("Please enter a valid address and radius.");
        return data;
    }

    debouncedLogEvent("location_filter", { userLat, userLon, radius });

    return data.filter(event => {
        if (!isNaN(event.Latitude) && !isNaN(event.Longitude)) {
            const distance = calculateDistance(
                userLat,
                userLon,
                parseFloat(event.Latitude),
                parseFloat(event.Longitude)
            );
            return distance <= radius;
        }
        return false;
    });
}

// Geocode an address to get latitude and longitude
function geocodeAddress(address, callback) {
    const apiKey = "AIzaSyBX9OiBSEsyLVrn86jYrYiKHrBOg7S9bCc";
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                callback(location.lat, location.lng);
            } else {
                alert("Unable to find location. Please try another address.");
            }
        })
        .catch(error => {
            console.error("Geocoding error:", error);
            alert("An error occurred while geocoding the address.");
        });
}

// Function to filter events by search text
function applyTextSearch(data, searchText) {
    if (!searchText.trim()) {
        return data; // Return all events if no search text is entered
    }

    const searchTextLower = searchText.toLowerCase();
    return data.filter(event => {
        const eventTitle = event.Event_Title ? event.Event_Title.toLowerCase() : "";
        const venue = event.Venue ? event.Venue.toLowerCase() : "";
        const address = event.Address ? event.Address.toLowerCase() : "";

        return eventTitle.includes(searchTextLower) || venue.includes(searchTextLower) || address.includes(searchTextLower);
    });
}

// Populate the table with grouped event data
function populateTable(data) {
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";

    let currentDate = "";
    if (data.length === 0) {
        noResultsMessage.style.display = "block"; // Show the no results message
    } else {
        noResultsMessage.style.display = "none"; // Hide the no results message

        data.forEach(event => {
            const eventDate = new Date(event.Date);
            const formattedDate = eventDate.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
            });

            if (formattedDate !== currentDate) {
                currentDate = formattedDate;

                const subheadingRow = document.createElement("tr");
                subheadingRow.classList.add("subheading-row");
                subheadingRow.innerHTML = `
                    <td colspan="5" style="text-align: left; font-weight: bold; background-color: #222;">
                        ${currentDate}
                    </td>
                `;
                tableBody.appendChild(subheadingRow);
            }

            const processedAddress = extractStreetAndSuburb(event.Address);
            const googleMapsLink = getGoogleMapsLink(processedAddress);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><a href="${event.url}" class="event_link" target="_blank">${event.Event_Title}</a></td>
                <td>${event.Venue}</td>
                <td><a href="${googleMapsLink}" class="maps_link" target="_blank">${processedAddress}</a></td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// Populate the map with markers
function populateMap(data) {
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    data.forEach(event => {
        const lat = parseFloat(event.Latitude);
        const lng = parseFloat(event.Longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            const marker = new google.maps.Marker({
                position: { lat, lng },
                map,
                title: event.Event_Title || "Untitled Event",
            });

            let customInfoWindow = null;

            marker.addListener("click", () => {
                if (customInfoWindow) {
                    customInfoWindow.setMap(null);
                    customInfoWindow = null;
                }

                class CustomInfoWindow extends google.maps.OverlayView {
                    constructor(position, content) {
                        super();
                        this.position = position;
                        this.content = content;
                    }

                    onAdd() {
                        const div = document.createElement("div");
                        div.style.position = "absolute";
                        div.style.backgroundColor = "#000";
                        div.style.color = "#fff";
                        div.style.padding = "10px";
                        div.style.borderRadius = "8px";
                        div.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.6)";
                        div.style.fontSize = "14px";
                        div.style.lineHeight = "1.5";
                        div.style.maxWidth = "200px";
                        div.style.wordWrap = "break-word";
                        div.style.textAlign = "center";

                        div.innerHTML = `
                            <div style="position: relative;">
                                <div style="position: absolute; top: 0; right: 0; cursor: pointer; color: #fff; font-size: 18px;" id="close-button">
                                    &times;
                                </div>
                                ${this.content}
                            </div>
                        `;

                        div.querySelector("#close-button").addEventListener("click", () => {
                            this.setMap(null);
                        });

                        this.div = div;
                        const panes = this.getPanes();
                        panes.floatPane.appendChild(div);
                    }

                    draw() {
                        if (!this.div) return;

                        const overlayProjection = this.getProjection();
                        const position = overlayProjection.fromLatLngToDivPixel(this.position);

                        const divWidth = this.div.offsetWidth || 200;
                        const divHeight = this.div.offsetHeight || 0;

                        this.div.style.left = `${position.x - divWidth / 2}px`;
                        this.div.style.top = `${position.y - divHeight - 15}px`;
                    }

                    onRemove() {
                        if (this.div) {
                            this.div.parentNode.removeChild(this.div);
                            this.div = null;
                        }
                    }
                }

                customInfoWindow = new CustomInfoWindow(
                    marker.getPosition(),
                    `<strong>${event.Event_Title}</strong><br>${event.Address}<br>${event.url
                        ? `<a href="${event.url}" target="_blank" style="color: #1e90ff; text-decoration: none;">Link</a>`
                        : "No Link Available"}`
                );
                customInfoWindow.setMap(map);
            });

            markers.push(marker);
        }
    });
}

// Initialize the Autocomplete feature for the Address input field
function initAutocomplete() {
    const addressInput = document.getElementById("address");

    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
        types: ["geocode"],
        componentRestrictions: { country: "au" },
    });

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        console.log("Selected place:", place);
    });
}

// Load event data on page load
function initialize() {
    loadEventData();
    document.getElementById("table-tab").click();
    initAutocomplete();
    initMap();
    addLinkClickListeners(); // Add listeners for hyperlink clicks
}

initialize();