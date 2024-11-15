// Global variable to hold event data from CSV
let eventsData = [];

// Function to load data from CSV and populate the table initially
function loadEventData() {
    Papa.parse("event_table.csv", {
        download: true,
        header: true,
        complete: function(results) {
            eventsData = results.data;
            populateTable(eventsData); // Populate the table with all events initially
        },
        error: function(error) {
            console.error("Error loading CSV:", error);
        }
    });
}

// Function to populate the table with event data
function populateTable(data) {
    const tableBody = document.querySelector("table tbody");
    tableBody.innerHTML = ""; // Clear any existing rows

    data.forEach(event => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${event.Event_Title}</td>
            <td>${event.Date}</td>
            <td>${event.Time}</td>
            <td>${event.Venue}</td>
            <td>${event.Address}</td>
            <td><a href="${event.url}" target="_blank">Link</a></td>
        `;
        tableBody.appendChild(row);
    });
}

// Function to filter events by the selected date range
function applyDateRangeFilter() {
    // Get the selected start and end dates
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    // Check if both dates are selected
    if (!startDate || !endDate) {
        alert("Please select both a start and an end date.");
        return;
    }

    // Convert the selected dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Filter events based on the date range
    const filteredData = eventsData.filter(event => {
        const eventDate = new Date(event.Date);
        return eventDate >= start && eventDate <= end;
    });

    // Populate the table with filtered data
    populateTable(filteredData);
}

// Load event data on page load
loadEventData();
