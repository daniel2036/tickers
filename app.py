import yfinance as yf
from flask import request, render_template, jsonify, Flask

app = Flask(__name__, template_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_stock_data', methods=['POST'])

def get_stock_data():
    json_data = request.get_json()
    ticker = json_data.get('ticker')

    try:
        stock = yf.Ticker(ticker)
        info = stock.fast_info
        print(f"{ticker} fast_info:", info)

        # Try fast_info first
        if info and 'lastPrice' in info and 'open' in info:
            return jsonify({
                'currentPrice': info['lastPrice'],
                'openPrice': info['open']
            })

        # Fallback to history() if fast_info is incomplete
        print(f"Falling back to history() for {ticker}")
        data = stock.history(period='1d', actions=False)
        print(data.tail())

        if not data.empty:
            latest = data.iloc[-1]
            return jsonify({
                'currentPrice': latest['Close'],
                'openPrice': latest['Open']
            })

        return jsonify({'error': f'No data found for {ticker}'}), 404

    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return jsonify({'error': f'Could not retrieve data for {ticker}'}), 500

if __name__ == '__main__':
    app.run(debug = True) 