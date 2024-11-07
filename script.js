document.addEventListener("DOMContentLoaded", () => {
    const table = document.querySelector("table"); // Selects the table element
    const rows = Array.from(table.querySelectorAll("tbody tr")); // Selects all rows in the tbody
    const dateFilter = document.getElementById("dateFilter");
    const venueFilter = document.getElementById("venueFilter");

    // Populate the filter dropdowns with unique dates and venues
    const dates = new Set();
    const venues = new Set();

    rows.forEach(row => {
        const date = row.cells[1].innerText; // Adjust index for Date column
        const venue = row.cells[3].innerText; // Adjust index for Venue column
        dates.add(date);
        venues.add(venue);
    });

    dates.forEach(date => {
        const option = document.createElement("option");
        option.value = date;
        option.innerText = date;
        dateFilter.appendChild(option);
    });

    venues.forEach(venue => {
        const option = document.createElement("option");
        option.value = venue;
        option.innerText = venue;
        venueFilter.appendChild(option);
    });

    // Define the filter function
    function filterTable() {
        const selectedDate = dateFilter.value;
        const selectedVenue = venueFilter.value;

        rows.forEach(row => {
            const date = row.cells[1].innerText; // Adjust index for Date column
            const venue = row.cells[3].innerText; // Adjust index for Venue column

            const dateMatch = !selectedDate || date === selectedDate;
            const venueMatch = !selectedVenue || venue === selectedVenue;

            row.style.display = dateMatch && venueMatch ? "" : "none";
        });
    }

    // Attach the filter function to the dropdowns
    dateFilter.addEventListener("change", filterTable);
    venueFilter.addEventListener("change", filterTable);
});
