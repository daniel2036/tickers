var tickers = JSON.parse(localStorage.getItem('tickers')) || [];
var lastPrices = {};
var counter = 15;

function startUpdateCycle() {
    updatePrices();
    setInterval(function () {
        counter--;
        $('#counter').text(counter);
        if (counter <= 0) {
            updatePrices();
            counter = 15;
        }
    }, 1000)
}

$(document).ready(function () {
    tickers.forEach(function (ticker) {
        addTickerToGrid(ticker);
    });
    updatePrices();

    // add ticker to grid and store locally
    $('#add-ticker-form').submit(function (e) {
        e.preventDefault();
        var newTicker = $('#new-ticker').val().toUpperCase();
        if (tickers.includes(newTicker)) {
            alert(`Ticker "${newTicker}" is already added.`);
            $('#new-ticker').val('');
            return;
        }

        // Check if it's valid by calling the server before adding
        $.ajax({
            url: '/get_stock_data',
            type: 'POST',
            data: JSON.stringify({ 'ticker': newTicker }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (data) {
                if (data.error) {
                    alert(`Ticker "${newTicker}" is invalid or data unavailable.`);
                } else {
                    tickers.push(newTicker);
                    localStorage.setItem('tickers', JSON.stringify(tickers));
                    addTickerToGrid(newTicker);
                    updatePrices();  // or just update that ticker if you prefer
                }
            },
            error: function () {
                alert(`Failed to retrieve data for ticker "${newTicker}".`);
            },
            complete: function () {
                $('#new-ticker').val('');  // always clear input
            }
        });
    });

    // remove ticker from grid
    $('#tickers-grid').on('click', '.remove-btn', function () {
        var tickerToRemove = $(this).data('ticker');
        tickers = tickers.filter(t => t !== tickerToRemove);
        localStorage.setItem('tickers', JSON.stringify(tickers))
        $(`#${tickerToRemove}`).remove();
    });

    startUpdateCycle();
});

// Information displayed with ticker
function addTickerToGrid(ticker) {
    $('#tickers-grid').append(`<div id = "${ticker}" class = "stock-box">
        <h2>${ticker}</h2>
        <p id = "${ticker}-price"></p>
        <p id = "${ticker}-pct"></p>
        <div class="chart-row">
            <canvas id="${ticker}-chart-7d" width="100" height="30"></canvas>
            <span class="chart-label">7D (1D)</span>
        </div>

        <div class="chart-row">
            <canvas id="${ticker}-chart-1d" width="100" height="30"></canvas>
            <span class="chart-label">Intraday (5m)</span>
        </div>
        <button class = "remove-btn" data-ticker="${ticker}">Remove</button>
        </div>`)
}

function updatePrices() {
    tickers.forEach(function (ticker) {
        $.ajax({
            url: '/get_stock_data',
            type: 'POST',
            data: JSON.stringify({ 'ticker': ticker }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (data) {
                var changePercentage = ((data.currentPrice - data.openPrice) / data.openPrice) * 100;
                var colorClass;

                // Colors for price change
                if (changePercentage <= -2) {
                    colorClass = 'red';
                } else if (changePercentage >= 2) {
                    colorClass = 'green';
                } else if (changePercentage == 0) {
                    colorClass = 'gray';
                } else if (changePercentage < 0) {
                    colorClass = 'light-red';
                } else {
                    colorClass = 'light-green';
                }
                $(`#${ticker}-price`).text(`$${data.currentPrice.toFixed(2)}`);
                $(`#${ticker}-pct`).text(`${changePercentage.toFixed(2)}%`);
                $(`#${ticker}-price`).removeClass('red light-red gray light-green green').addClass(colorClass);
                $(`#${ticker}-pct`).removeClass('red light-red gray light-green green').addClass(colorClass);

                // Flash on price changes
                var animationClass;
                if (lastPrices[ticker] > data.currentPrice) {
                    animationClass = 'red-flash';
                } else if (lastPrices[ticker] < data.currentPrice) {
                    animationClass = 'green-flash';
                } else {
                    animationClass = 'gray-flash';
                }
                lastPrices[ticker] = data.currentPrice;
                $(`#${ticker}`).addClass(animationClass);
                setTimeout(function () {
                    $(`#${ticker}`).removeClass(animationClass);
                }, 1000);

                // Draw 7 day sparkline
                const ctx7d = document.getElementById(`${ticker}-chart-7d`).getContext('2d');

                // Destroy old chart if re-rendering
                if (window[`${ticker}Chart7d`]) {
                    window[`${ticker}Chart7d`].destroy();
                }

                window[`${ticker}Chart7d`] = new Chart(ctx7d, {
                    type: 'line',
                    data: {
                        labels: data.weekChartData.map((_, i) => i + 1),
                        datasets: [{
                            data: data.weekChartData,
                            borderColor: colorClass,
                            borderWidth: 1,
                            pointRadius: 0,
                            tension: 0.3,
                            fill: false,
                        }]
                    },
                    options: {
                        responsive: false,
                        plugins: {
                            legend: { display: false },
                        },
                        scales: {
                            x: { display: false },
                            y: { display: false }
                        }
                    }
                });

                // Draw 1 day sparkline
                const ctx1d = document.getElementById(`${ticker}-chart-1d`).getContext('2d');

                // Destroy old chart if re-rendering
                if (window[`${ticker}Chart1d`]) {
                    window[`${ticker}Chart1d`].destroy();
                }

                window[`${ticker}Chart1d`] = new Chart(ctx1d, {
                    type: 'line',
                    data: {
                        labels: data.dayChartData.map((_, i) => i + 1),
                        datasets: [{
                            data: data.dayChartData,
                            borderColor: colorClass,
                            borderWidth: 1,
                            pointRadius: 0,
                            tension: 0.3,
                            fill: false,
                        }]
                    },
                    options: {
                        responsive: false,
                        plugins: {
                            legend: { display: false },
                        },
                        scales: {
                            x: { display: false },
                            y: { display: false }
                        }
                    }
                });
            }
        });
    });
}