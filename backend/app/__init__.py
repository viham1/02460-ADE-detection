import os
from os import environ
from os.path import join, dirname, realpath
from telnetlib import DO
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import urllib
import logging

app = Flask(__name__)
CORS(app)

AI_MODELS_FOLDER = join(dirname(realpath(__file__)), "ai_models/")
app.config["AI_MODELS_FOLDER"] = AI_MODELS_FOLDER
app.config["SQLALCHEMY_DATABASE_URI"] = ""


# db = SQLAlchemy(app)

from blue_prints.medical_screening.medical_screening import Medical_screening_bp

app.register_blueprint(Medical_screening_bp, url_prefix="/api")

# try:
#     db.create_all()
# except Exception as e:
#     print(e)
#     db.session.rollback()
# db.session.commit()
