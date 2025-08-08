'''
IMPORT required modules for:
    - sentence transformers
'''
import os
import sys
import json
import contextlib

def cluster_match(model, clusters, matchTo):
    result = []

    # encode the terms
    category_embedding = model.encode(clusters, convert_to_tensor=True)
    term_embedding = model.encode(matchTo, convert_to_tensor=True)
    
    similarities = util.pytorch_cos_sim(term_embedding, category_embedding)

    # find the cluster that matches the best
    similarities = similarities.tolist()[0]
    
    i = 0
    for ele in similarities:
        if ele >= 0.5:
            result.append(clusters[i])

        i += 1

    return result


# Suppress all stdout/stderr temporarily during model load
@contextlib.contextmanager
def suppress_output():
    with open(os.devnull, 'w') as devnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = devnull
        sys.stderr = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

# Set environment variables to disable HuggingFace noise
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '1'
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

with suppress_output():
    # match to clusters
    from sentence_transformers import SentenceTransformer, util

    # Initialise the sentence transformer model
    # slightly less accurate but faster
    model = SentenceTransformer("all-MiniLM-L6-v2")

# get the score for a particular keyword list
def getSimilarity(model, keywords, categories):
    total_score = 0
    # encode the cateogires
    category_embeddings = model.encode(categories, convert_to_tensor=True)
    # iterate over each keyword
    for kw in keywords:
        kw_embedding = model.encode(kw, convert_to_tensor=True)
        # get the similarity score between the keyword and each category
        similarities = util.pytorch_cos_sim(kw_embedding, category_embeddings)
        # get the sum of the similarity scores for each category
        score = sum(similarities).tolist()[0]
        total_score += score
    return total_score

# get the score for each cluster
def clusterSimilarity(model, keywords, clusters):
    scores = {}
    # encode the keywords
    keywords_embeddings = model.encode(keywords, convert_to_tensor=True)
    # iterate over the clusters
    for cl in clusters:
        cl_embedding = model.encode(cl, convert_to_tensor=True)
        # get the similarity score between the cluster and the keywords
        similarities = util.pytorch_cos_sim(cl_embedding, keywords_embeddings)
        # the score of the cluster is the sum of the similarity scores
        score = sum(similarities).tolist()[0]
        scores[cl] = score
    return scores

# direct matching
def directMatching(researcherPool, keywords, cutOffMethod, cutOff):
    # ensure that the cutoffmethod is either number or strictness
    assert cutOffMethod in ['number', 'strictness']

    researchers = {}
    # iterate over each researcher
    for researcher in researcherPool:
        # get their information
        researcherEmail = researcher['email']
        researcherKeywords = researcher['keywords']
        # get the similarity score
        similarity = getSimilarity(model, researcherKeywords, keywords)
        researchers[researcherEmail] = similarity
    
    # sort it by the score
    researchers = {k: v for k, v in sorted(researchers.items(), key=lambda item: item[1])}

    # get the number of researchers to keep
    if cutOffMethod == 'number':
        number = int(cutOff)
    else:
        number = round(len(researcherPool) * (1 - cutOff))
    
    # if the number of researchers to keep is less than the total number of researchers...
    if number < len(researchers.keys()):
        # only keep the top few researchers
        highestScoringResearchers = {k: researchers[k] for k in list(researchers)[-number:]}
    else:
        # otherwise, keep all researchers
        highestScoringResearchers = researchers
    
    return highestScoringResearchers

# matching through clusters
def clusterMatching(researcherPool, allClusters, keywords, cutOffMethod, cutOff):
    # ensure that the cutoffmethod is either number or strictness
    assert cutOffMethod in ['number', 'strictness']

    researchers = {}
    # get the similarity scores for each cluster
    similarities = clusterSimilarity(model, keywords, allClusters)

    # iterate over each researcher
    for researcher in researcherPool:
        # get their information
        researcherEmail = researcher['email']
        researcherClusters = researcher['clustersNames']

        # calculate the researcher's score (add up the corresponding similarity score to the keywords for each cluster in the researcher's list)
        researcherScore = 0
        for cl in researcherClusters:
            researcherScore += similarities[cl]

        # prevents divide by zero errors
        if len(researcherClusters) > 0:
            # compute the average (ensures that researchers with more clusters dont get a higher score than researchers with less clusters)
            researchers[researcherEmail] = researcherScore / len(researcherClusters)
    
    # sort it by the score
    researchers = {k: v for k, v in sorted(researchers.items(), key=lambda item: item[1])}
    
    # get the number of researchers to keep
    if cutOffMethod == 'number':
        number = int(cutOff)
    else:
        number = round(len(researcherPool) * (1 - cutOff))
    
    # if the number of researchers to keep is less than the total number of researchers...
    if number < len(researchers.keys()):
        # only keep the top few researchers
        highestScoringResearchers = {k: researchers[k] for k in list(researchers)[-number:]}
    else:
        # otherwise, keep all researchers
        highestScoringResearchers = researchers
    
    return highestScoringResearchers

# get the information from nodejs
keywords = json.loads(sys.argv[1])
allClusters = json.loads(sys.argv[2])

# Read JSON data from stdin
researcherPool = sys.stdin.read()

try:
    researcherPool = json.loads(researcherPool)
except json.JSONDecodeError as e:
    raise Exception(e)

# which function used depends on which method the user wants to use
if sys.argv[5] == "direct":
    researchersDirect = directMatching(researcherPool, keywords, sys.argv[3], float(sys.argv[4]))
    sys.stdout.write(json.dumps(researchersDirect))
else:
    researchersCluster = clusterMatching(researcherPool, allClusters, keywords, sys.argv[3], float(sys.argv[4]))
    sys.stdout.write(json.dumps(researchersCluster))
