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
    model = SentenceTransformer("./paraphrase-MiniLM-L3-v2")

def getSimilarity(model, keywords, categories):
    total_score = 0
    category_embeddings = model.encode(categories, convert_to_tensor=True)
    for kw in keywords:
        kw_embedding = model.encode(kw, convert_to_tensor=True)
        similarities = util.pytorch_cos_sim(kw_embedding, category_embeddings)
        score = sum(similarities).tolist()[0]
        total_score += score
    return total_score

def clusterSimilarity(model, keywords, clusters):
    scores = {}
    keywords_embeddings = model.encode(keywords, convert_to_tensor=True)
    for cl in clusters:
        cl_embedding = model.encode(cl, convert_to_tensor=True)
        similarities = util.pytorch_cos_sim(cl_embedding, keywords_embeddings)
        score = sum(similarities).tolist()[0]
        scores[cl] = score
    return scores

def directMatching(researcherPool, keywords, cutOffMethod, cutOff):
    assert cutOffMethod in ['number', 'strictness']
    researchers = {}
    for researcher in researcherPool:
        researcherEmail = researcher['email']
        researcherKeywords = researcher['keywords']
        similarity = getSimilarity(model, researcherKeywords, keywords)
        researchers[researcherEmail] = similarity
    
    researchers = {k: v for k, v in sorted(researchers.items(), key=lambda item: item[1])}

    if cutOffMethod == 'number':
        number = cutOff
    else:
        number = round(len(researcherPool) * (1 - cutOff))
    
    if number < len(researchers.keys()):
        highestScoringResearchers = {k: researchers[k] for k in list(researchers)[-number:]}
    else:
        highestScoringResearchers = researchers
    
    return highestScoringResearchers

def clusterMatching(researcherPool, allClusters, keywords, cutOffMethod, cutOff):
    assert cutOffMethod in ['number', 'strictness']
    researchers = {}
    similarities = clusterSimilarity(model, keywords, allClusters)
    for researcher in researcherPool:
        researcherEmail = researcher['email']
        researcherClusters = researcher['clustersNames']
        researcherScore = 0
        for cl in researcherClusters:
            researcherScore += similarities[cl]
        if len(researcherClusters) > 0:
            researchers[researcherEmail] = researcherScore / len(researcherClusters)
    
    researchers = {k: v for k, v in sorted(researchers.items(), key=lambda item: item[1])}
    
    if cutOffMethod == 'number':
        number = cutOff
    else:
        number = round(len(researcherPool) * (1 - cutOff))
    
    if number < len(researchers.keys()):
        highestScoringResearchers = {k: researchers[k] for k in list(researchers)[-number:]}
    else:
        highestScoringResearchers = researchers
    
    return highestScoringResearchers

keywords = json.loads(sys.argv[1])
allClusters = json.loads(sys.argv[2])
researcherPool = json.loads(sys.argv[3])

researchersDirect = directMatching(researcherPool, keywords, "number", 2)
researchersCluster = clusterMatching(researcherPool, allClusters, keywords, "number", 2)

sys.stdout.write(json.dumps(researchersDirect))