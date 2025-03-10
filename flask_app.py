from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
@app.route("/home")
def default_home():
    return render_template('base.html')

@app.route("/game")
@app.route("/index")
@app.route("/start")
@app.route("/maze")
def maze():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
