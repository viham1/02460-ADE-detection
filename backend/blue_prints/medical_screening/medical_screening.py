from flask import Blueprint, request
from sqlalchemy import or_, func
import os
from flask import current_app
from app.ai_models.ai_functions import process_NER_text
from app.ai_models.qa_functions import process_QA
from app.ai_models.translation import translate_fr_to_en
import requests
import xmltodict, json
import xml.etree.ElementTree as ET
from tqdm import tqdm
import time

Medical_screening_bp = Blueprint(
    "Medical_screening_bp",
    __name__,
    template_folder="templates",
    static_folder="static",
)

naranjo_questions = [
'Are there previous conclusive reports on PLACE_EFFECT ?',
'Did PLACE_EFFECT occur after PLACE_DRUG was administered ?',
'Did PLACE_EFFECT improve when PLACE_DRUG was discontinued or a specific antagonist was administered ?',
'Did PLACE_EFFECT reappear when PLACE_DRUG was readministered ?',
'Are there alternative causes (other than PLACE_DRUG) that could have on their own cause PLACE_EFFECT ?',
'Did PLACE_EFFECT reappear when a placebo was given?',
'Was PLACE_DRUG detected in the blood (or other fluids) in concentrations known to be toxic ?',
'Was PLACE_EFFECT more severe when the dose was increased or less severe when the dose was decreased ?',
'Did the patient have a reaction similar to PLACE_EFFECT with PLACE_DRUG or similar drugs in any previous exposure ?',
'Was the PLACE_EFFECT confirmed by any objective evidence?',
]

@Medical_screening_bp.route("/translate", methods=["POST"])
def translate():
    data = request.json
    text = data["text"]
   

    r = translate_fr_to_en(text)
    #answer = r["answer"]
    #score = r["score"]

    return {"data":r}


@Medical_screening_bp.route("/qa", methods=["POST"])
def answer_question():
    data = request.json
    context = data["context"]
    question = data["question"]

    r = process_QA(context,question)
    #answer = r["answer"]
    #score = r["score"]

    return r


@Medical_screening_bp.route("/process_text", methods=["POST"])
def process_text():
    data = request.json
    text = data["text"]
    analysis = process_NER_text([text], mode="polarized_rel")

    for pair in tqdm(analysis["relations"]):
            naranjo = [] 
            
            drug = pair["drug"]
            reaction = pair["reaction"]
            for i,question in enumerate(naranjo_questions):

                question_result = {}

                question_formatted = question.replace("PLACE_EFFECT", reaction)
                question_formatted = question_formatted.replace("PLACE_DRUG", drug)
                try:
                    question_result = process_QA(text , question_formatted)
                    question_result["id"] = i + 1
                except Exception as e:
                    print(e,text , question_formatted)
                finally:
                    naranjo.append(question_result)

            pair["naranjo"] = naranjo


    return {"result" : analysis}

@Medical_screening_bp.route("/abstracts", methods=["GET"])
def retrieve_abstracts():

    search = request.args.get("search")
    ds = request.args.get("ds")  # YYYY/DD/MM
    de = request.args.get("de") 
    batch = request.args.get("batch") # YYYY/DD/MM

    if not batch :
        batch = 15

    url = f"""https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&WebEnv=1&term={search}&retmax={batch}&datetype=pdat"""

    if ds:
        url = url + f"mindate={ds}"
    if de:
        url = url + f"&maxdate={de}"


    r = requests.get(url=url)
    data = xmltodict.parse(r.content)
    citations_list = data["eSearchResult"]["IdList"]["Id"]
    total_count = data["eSearchResult"]["Count"]

    citations = []
    start = time.time()

    for citation in citations_list:
        url = f"""https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={citation}&retmode=xml&rettype=abstract"""
        r = requests.get(url=url)
        data = xmltodict.parse(r.content)

        result={}
        #Initialisation of citation metadata
        result["title"] = ""
        result["abstract"] = ""
        result["publication_date"] = ""
        result["revision_date"] = ""
        result["authors"] = []
        result["citation_type"] = ""
        result["journal"] = ""
        result["database"] = "pubmed"
        result["id"] = citation
        result["link"] = f"https://pubmed.ncbi.nlm.nih.gov/{citation}/"

        try:
            if type(data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]) is str:
                result["abstract"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]
            elif type(data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]) is dict:
                result["abstract"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]["#text"]
            else:
                result["abstract"] = " ".join(
                    [sent["#text"] for sent in data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]]
                )
        except Exception as e:
            print(f"Can't find a valid abstract for citation {citation}")
            continue

        analysis = process_NER_text([result["abstract"]], mode="polarized_rel")
        result["analysis"] = analysis

        if len(analysis["pairs_suspected"]) > 0:
            result["suspected_AE"] = "suspected ADE"
        else:
            result["suspected_AE"] = "no suspected ADE"

        try:
            article = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]
        except Exception as e:
            pass

        try:
            result["publication_date"] = article["ArticleDate"]
        except Exception as e:
            pass

        try:
            result["revision_date"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["DateRevised"]
        except Exception as e:
            pass

        try:
            if type(article["AuthorList"]["Author"]) is not list:
                result["authors"] = [article["AuthorList"]["Author"]["ForeName"] + " " + article["AuthorList"]["Author"]["LastName"]]
            else:
                result["authors"] = [author["ForeName"] + " " + author["LastName"] for author in article["AuthorList"]["Author"]]
        except Exception as e:
            pass

        try:
            result["title"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["ArticleTitle"]
        except Exception as e:
            pass 

        try:
            result["citation_type"] = article["PublicationTypeList"]["PublicationType"]["#text"]
        except Exception as e:
            pass 

        try:
            result["journal"] = article["Journal"]["Title"]
        except Exception as e:
            pass 

        citations.append(result)
    end = time.time()
    print(end - start)

    return {"requested": batch,"received":len(citations),"data": citations}



@Medical_screening_bp.route("/naranjo", methods=["POST"])
def get_naranjo_answers():
    data = request.json
    
    pair = data['pair']
    abstract = data['abstract']

 
    naranjo = [] 
    
    drug = pair["drug"]
    reaction = pair["reaction"]
    for i,question in enumerate(naranjo_questions):

        question_result = {}

        question_formatted = question.replace("PLACE_EFFECT", reaction)
        question_formatted = question_formatted.replace("PLACE_DRUG", drug)
        try:
            question_result = process_QA(abstract , question_formatted)
            question_result["id"] = i + 1
            
        except Exception as e:
            print(e,abstract , question_formatted)
        finally:
            naranjo.append(question_result)

    return{"data":naranjo}







@Medical_screening_bp.route("/abstracts", methods=["POST"])
def retrieve_adhoc_abstracts():

    data = request.json
    citations_list = data["citations_id"]

    citations = []

    for citation in tqdm(citations_list):
        url = f"""https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={citation}&retmode=xml&rettype=abstract"""
        r = requests.get(url=url)
        data = xmltodict.parse(r.content)

        result={}
        #Initialisation of citation metadata
        result["title"] = ""
        result["abstract"] = ""
        result["publication_date"] = ""
        result["revision_date"] = ""
        result["authors"] = []
        result["citation_type"] = ""
        result["journal"] = ""
        result["database"] = "pubmed"
        result["id"] = citation
        result["link"] = f"https://pubmed.ncbi.nlm.nih.gov/{citation}/"

        try:
            if type(data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]) is str:
                result["abstract"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]
            elif type(data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]) is dict:
                result["abstract"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]["#text"]
            else:
                result["abstract"] = " ".join(
                    [sent["#text"] for sent in data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]]
                )
        except Exception as e:
            print(f"Can't find a valid abstract for citation {citation}")
            continue

        analysis = process_NER_text([result["abstract"]])
        result["analysis"] = analysis

        for pair in tqdm(result["analysis"]["relations"]):
            naranjo = [] 
            
            drug = pair["drug"]
            reaction = pair["reaction"]
            for i,question in enumerate(naranjo_questions):

                question_result = {}

                question_formatted = question.replace("PLACE_EFFECT", reaction)
                question_formatted = question_formatted.replace("PLACE_DRUG", drug)
                try:
                    question_result = process_QA(result["abstract"] , question_formatted)
                    question_result["id"] = i + 1
                except Exception as e:
                    print(e,result["abstract"] , question_formatted)
                finally:
                    naranjo.append(question_result)

            pair["naranjo"] = naranjo

        if len(analysis["pairs_suspected"]) > 0:
            result["suspected_AE"] = "suspected ADE"
        else:
            result["suspected_AE"] = "no suspected ADE"

        try:
            article = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]
        except Exception as e:
            pass

        try:
            result["publication_date"] = article["ArticleDate"]
        except Exception as e:
            pass

        try:
            result["revision_date"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["DateRevised"]
        except Exception as e:
            pass

        try:
            if type(article["AuthorList"]["Author"]) is not list:
                result["authors"] = [article["AuthorList"]["Author"]["ForeName"] + " " + article["AuthorList"]["Author"]["LastName"]]
            else:
                result["authors"] = [author["ForeName"] + " " + author["LastName"] for author in article["AuthorList"]["Author"]]
        except Exception as e:
            pass

        try:
            result["title"] = data["PubmedArticleSet"]["PubmedArticle"]["MedlineCitation"]["Article"]["ArticleTitle"]
        except Exception as e:
            pass 

        try:
            result["citation_type"] = article["PublicationTypeList"]["PublicationType"]["#text"]
        except Exception as e:
            pass 

        try:
            result["journal"] = article["Journal"]["Title"]
        except Exception as e:
            pass


        citations.append(result)

    return {"requested": len(citations_list),"received":len(citations),"data": citations}




# @Medical_screening_bp.route("/process", methods=["POST"])
# def process_text():
#     data = request.json
#     text = data["text"]
#     mode = request.args.get("mode")

#     entities = process_NER_text([text], mode)

#     # print(entities)

#     return {"data": entities}
