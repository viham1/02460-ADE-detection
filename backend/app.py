from app import app
from waitress import serve

if __name__ == "__main__":
    #serve(app, host="0.0.0.0", port=8080, threads=1)
    app.run(host ='0.0.0.0',debug=True)
