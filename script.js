// Global variable to hold event data
let eventsData = [];

// Helper function to format the date from yyyy/mm/dd to dd/mm/yyyy
function formatDate(isoDate) {
    if (!isoDate || isoDate.trim() === "") return ""; // Handle empty or invalid dates gracefully

    const [year, month, day] = isoDate.split("/");
    return `${day}/${month}/${year}`; // Format: dd/mm/yyyy
}

// Convert degrees to radians
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Calculate distance between two coordinates using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

// Load event data from CSV
function loadEventData() {
    Papa.parse("event_table.csv", {
        download: true,
        header: true,
        complete: function(results) {
            eventsData = results.data;
            populateTable(eventsData);
        },
        error: function(error) {
            console.error("Error loading event CSV:", error);
        }
    });
}

// Function to populate the table with grouped event data
function populateTable(data) {
    const tableBody = document.querySelector("table tbody");
    tableBody.innerHTML = "";

    let currentDate = "";

    data.forEach(event => {
        const eventDate = new Date(event.Date); // Parse yyyy/mm/dd directly
        const formattedDate = eventDate.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
        });

        if (formattedDate !== currentDate) {
            currentDate = formattedDate;

            const subheadingRow = document.createElement("tr");
            subheadingRow.classList.add('subheading-row');
            subheadingRow.innerHTML = `
                <td colspan="5" style="text-align: left; font-weight: bold; background-color: #222;">
                    ${currentDate}
                </td>
            `;
            tableBody.appendChild(subheadingRow);
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${event.Event_Title}</td>
            <td>${event.Time}</td>
            <td>${event.Venue}</td>
            <td>${event.Address}</td>
            <td><a href="${event.url}" target="_blank">Link</a></td>
        `;
        tableBody.appendChild(row);
    });
}

// Filter events by radius
function applyRadiusFilter() {
    const inputAddress = document.getElementById("address").value;
    const radius = parseFloat(document.getElementById("radius").value);

    if (!inputAddress || isNaN(radius)) {
        alert("Please enter a valid address and radius.");
        return;
    }

    geocodeAddress(inputAddress, (userLat, userLon) => {
        const filteredEvents = eventsData.filter(event => {
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

        populateTable(filteredEvents);
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

// Function to filter events by the selected date range
function applyDateRangeFilter() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (!startDate || !endDate) {
        alert("Please select both a start and an end date.");
        return;
    }

    const start = new Date(startDate); // yyyy/mm/dd is ISO-like, so this works
    const end = new Date(endDate);

    const filteredData = eventsData.filter(event => {
        const eventDate = new Date(event.Date);
        return eventDate >= start && eventDate <= end;
    });

    populateTable(filteredData);
}

// Load event data on page load
function initialize() {
    loadEventData();
}
initialize();
