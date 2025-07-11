# IMPORT MODULES
import os
import sys
import json
import contextlib

# generate clusters
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

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

    # string matching
    from fuzzywuzzy import fuzz

# natural language toolkit
from nltk.tokenize import word_tokenize
import nltk

# numpy to process results from other modules
import numpy as np

# keyword extraction
from multi_rake import Rake

# get gender
import gender_guesser.detector as gender

# calculate time taken for build to run
import time

# api calls
from bs4 import BeautifulSoup
import requests
from scholarly import scholarly

# used to remove html from text
import re

# threads for time efficiency
from multiprocessing.pool import ThreadPool

#print('imports finished')

# IMPORTING INFORMATION
# When in a new environment, don't forget to:
#   nltk.download('punkt_tab')
#
# and pip install everything above!

# WARNING FOR THE FUTURE
# Warning (from warnings module):
#   File "C:\Users\Emma\AppData\Local\Programs\Python\Python312\Lib\site-packages\fuzzywuzzy\fuzz.py", line 11
#     warnings.warn('Using slow pure-python SequenceMatcher. Install python-Levenshtein to remove this warning')
# UserWarning: Using slow pure-python SequenceMatcher. Install python-Levenshtein to remove this warning

def google_scholar(urlId):
    '''Gets the researcher's interests from Google Scholar'''

    # find the researcher by name
    first_name, last_name = urlId.split('.')
    name = first_name + ' ' + last_name
    search_query = list(scholarly.search_author(name))
    search_query = [author for author in search_query \
            if author['email_domain'] == '@sydney.edu.au']

    # researcher might not exist with the inputted name
    # for example, "Kate Jolliffe" on USYD is actually
    # "Katrina Jolliffe" on Google Scholar.
    if len(search_query) == 0:
        # search by last name only
        search_query = list(scholarly.search_author(last_name))
        search_query = [author for author in search_query \
                if author['email_domain'] == '@sydney.edu.au']

        # if still nothing, theres no hope to be found :(
        if len(search_query) == 0:
            return []

        # but if theres more than one person, use fuzzywuzzy
        # to get the information on the person whose first
        # name is closest to the name found on USYD's website.
        elif len(search_query) > 1:
            max_ratio = 0
            max_ratio_query = None
            for author in search_query:
                ratio = fuzz.ratio(author['name'], name)
                if ratio > max_ratio:
                    max_ratio_query = author
                    max_ratio = ratio
            author = scholarly.fill(max_ratio_query)
    else:
        # get their information
        author = scholarly.fill(search_query[0])

    # return their interests information
    return author['interests']

def researcher_clusters(term, model, category_embeddings, categories, clusterRangeSetting, strictness):
    '''Find which cluster a researcher belongs to'''

    # encode the researcher's keywords
    term_embedding = model.encode(term, convert_to_tensor=True)
    
    similarities = util.pytorch_cos_sim(term_embedding, category_embeddings)

    # find the cluster that matches the best
    best_index = similarities.argmax()
    best_category = categories[best_index]
    
    similarities = similarities.tolist()[0]
    best_score = similarities[best_index]

    # find the clusters that match well
    good = [categories[i] for i in range(len(similarities)) \
                  if similarities[i] >= best_score - clusterRangeSetting and \
                similarities[i] >= strictness]

    return good

def get_categories(texts, num_clusters=45):
    '''Generate clusters using TF-IDF and K-means.'''
    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(texts)

    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X)
    return kmeans, clusters, vectorizer

def get_top_keywords(model, feature_names, n_terms=2):
    '''Generates a suitable name for a cluster'''
    cluster_dictionary = {}
    cluster_names = []

    for i, cluster_center in enumerate(model.cluster_centers_):
        # finds the values at the 'center' of the cluster. these
        # values are the exemplars of the cluster, so they will
        # be used to generate a suitable name
        sorted_indices = np.argsort(cluster_center)
        
        top2_indices = sorted_indices[-2:]
        top2_indices = [feature_names[j] for j in reversed(top2_indices)]

        top6_indices = sorted_indices[-6:]
        top6_indices = [feature_names[j] for j in reversed(top6_indices)]

        cluster_dictionary[i] = {'name': top2_indices, 'description': top6_indices}
        cluster_names.append(', '.join(top2_indices))

    return cluster_dictionary, cluster_names

def extract_keywords(text_en, num=10, maxlength=3):
    '''Gets keywords from a piece of text'''
    rake = Rake(max_words=maxlength)
    keywords = rake.apply(text_en)

    if keywords == []:
        return []
    else:
        if num == 1:
            return keywords[:num][0][0]
        return [kw[0] for kw in keywords[:num]]

def research_interest_keywords(urlId):
    '''Scrapes the researcher's profile'''
    # scrape the website
    url = f'https://www.sydney.edu.au/AcademicProfiles/interfaces/rest/getExpertiseDetails/{urlId}'
    response = requests.get(url)
    content = response.json()
    content = content['blurb']
    
    # remove HTML
    if content != None:
        content = re.sub(r"<.*?>", "", content)
        content = re.sub(r"(\n)|(\r)|(\t)", "", content)
    else:
        content = ''
        
    return (content, extract_keywords(content))

def get_grants(urlId):
    grants = []
    grants_kw = []

    # Scrape for grants
    grants = f'https://www.sydney.edu.au/AcademicProfiles/interfaces/rest/getGrantDetails/{urlId}'
    response = requests.get(grants)
    content = response.json()
    content = content['grants']

    # Add to grants and grants_kw
    if content != []:
        grants = [c['title'] for c in content]
        grants_kw = extract_keywords(' '.join(grants))

    return (grants, grants_kw)

def get_pubs(urlId):
    pubs = []
    pubs_kw = []

    # Scrape for publications
    pubs = f'https://www.sydney.edu.au/AcademicProfiles/interfaces/rest/getAuthorDetails/{urlId}'
    response = requests.get(pubs)
    content = response.json()
    content = content['researchPublications']

    # Add to pubs and pubs_kw
    if content != []:
        pubs = [c['publicationTitle'] for c in content]
        pubs_kw = extract_keywords(' '.join(pubs))

    return (pubs, pubs_kw)

def main(affectedResearchers, affectedFields, clusterRangeSetting, strictness, maxNumber, googlescholar=True, url="https://www.sydney.edu.au/AcademicProfiles/interfaces/rest/performSimpleAttributeSearch/+jobType:1%20+orgUnitCode:5000053020L0000%20+isMediaExpert:true/0/270/byRelevance/false"):
    # Important Lists (Internal Data Storage)
    texts = []         # list of all keywords (for cluster generation)
    researchers = {}   # where all the researcher's information will be stored in

    # Set up gender detector
    d = gender.Detector()

    # Scrape for every researcher
    response = requests.get(url)
    allResearchers = response.json()

    if affectedResearchers != 'all':
        content = []
        for researcher in allResearchers:
            if researcher['urlId'] in affectedResearchers:
                content.append(researcher)
    else:
        content = allResearchers

    #print('scraping & processing finished')

    # Start timer
    tic = time.perf_counter()
    #print('start timer')

    # THREAD POOLS
    
    # Each thread here goes to the research_interest_keywords function
    bio_jobs = []
    bio_pool = ThreadPool(processes=222)
    
    # Each thread here goes to the google_scholar function
    gs_jobs = []
    gs_pool = ThreadPool(processes=222)

    # Each thread here goes to the get_grants function
    grant_jobs = []
    grant_pool = ThreadPool(processes=222)

    # Each thread here goes to the get_pubs function
    pub_jobs = []
    pub_pool = ThreadPool(processes=222)

    # ITERATE THROUGH SCRAPED CONTENT
    for researcher in content:
        # Find career stage through 'salutation'
        # This can be one of:
        #   - Dr       - Ms
        #   - Professor
        #   - Associate Professor
        #   - Professor Emeritus
        #   - Professor Emerita
        
        salutation = researcher['salutation']

        # Exclude from dataset if they are retired (emeritus/emerita)
        # or if they don't have a phd (ms)
        if 'Emerit' not in salutation and salutation != 'Ms':
            # Name information
            urlId = researcher['urlId']
            name = researcher['staffName']
            researchers[urlId] = {}

            if 'name' in affectedFields:
                researchers[urlId]['name'] = name

            # Gender
            if 'gender' in affectedFields:
                researchers[urlId]['gender'] = d.get_gender(name.split(' ')[0])

            # Find possible career stages based on their salutation
            if 'cds' in affectedFields:
                if salutation == 'Dr':
                    cds = 'ECR'
                elif salutation == 'Associate Professor':
                    cds = 'MCR'
                elif salutation == 'Professor':
                    cds = 'SR'

                researchers[urlId]['cds'] = cds
            
            # Get the researcher's school
            if 'school' in affectedFields:
                affiliation = researcher['affiliationList'][0].lower()
                if 'chemistry' in affiliation:
                    researchers[urlId]['school'] = 'chemistry'
                elif 'geoscience' in affiliation:
                    researchers[urlId]['school'] = 'geoscience'
                elif 'life and environmental' in affiliation:
                    researchers[urlId]['school'] = 'biology'
                elif 'veterinary' in affiliation:
                    researchers[urlId]['school'] = 'veterinary'
                elif 'mathematics' in affiliation:
                    researchers[urlId]['school'] = 'mathematics'
                elif 'physics' in affiliation:
                    researchers[urlId]['school'] = 'physics'
                elif 'philosphy' in affiliation:
                    researchers[urlId]['school'] = 'philosphy'
                elif 'psychology' in affiliation:
                    researchers[urlId]['school'] = 'psychology'

            # Get their keywords
            if 'keywords' in affectedFields:
                Mediakeywords = researcher['mediaKeyword'].replace('-', ' ')
                researchers[urlId]['keywords'] = Mediakeywords.split("; ")
                texts.append(Mediakeywords)

                # If no media keywords are available, get keywords from
                # google scholar
                if (Mediakeywords == '' or Mediakeywords.isspace()) and googlescholar:
                    async_result = gs_pool.apply_async(google_scholar, (urlId,))
                    gs_jobs.append((urlId, async_result))
            elif 'clusters' in affectedFields:
                # Add the keywords to the dictionary
                keywords = researcher['mediaKeyword'].replace('-', ' ')
                researchers[urlId]['keywords'] = keywords.split("; ")
                texts.append(keywords)

            # APPLY POOLS
            # Rationale - API calls take a while. Increase efficiency by threading.
            
            # Biography pool
            if 'profile' in affectedFields:
                async_result = bio_pool.apply_async(research_interest_keywords, (urlId,))
                bio_jobs.append((urlId, async_result))

            # Publications/Grants pools
            if 'grants' in affectedFields:
                async_result = grant_pool.apply_async(get_grants, (urlId,))
                grant_jobs.append((urlId, async_result))

            if 'pubs' in affectedFields:
                async_result = pub_pool.apply_async(get_pubs, (urlId,))
                pub_jobs.append((urlId, async_result))

    # PROCESS POOLS
    #print('pool time')

    # Check time
    toc = time.perf_counter()
    #print(f"Preprocessing finished in {(toc - tic)/60:0.0f} minutes {(toc - tic)%60:0.0f} seconds")
    #print(f"Preprocessing finished in {toc - tic:0.4f} seconds")

    # Handle biography jobs (won't run if empty)
    for urlId, job in bio_jobs:
        # Get output
        res = job.get()
        # Split output into raw profile and profile keywords
        profile, keywords = res[0], res[1]

        # Add keywords to data
        if 'keywords' in affectedFields or 'clusters' in affectedFields:
            researchers[urlId]['keywords'] += keywords
            texts.append('; '.join(keywords))

        # Add profile to data
        researchers[urlId]['profile'] = profile

    # Close pool to free up resources
    bio_pool.close()
    #print('1 - bio done')

    # Check time
    toc = time.perf_counter()
    #print(f"Biographies finished in {(toc - tic)/60:0.0f} minutes {(toc - tic)%60:0.0f} seconds")
    #print(f"Biographies finished in {toc - tic:0.4f} seconds")

    # Handle google scholar jobs (won't run if empty)
    for urlId, job in gs_jobs:
        # Get output
        keywords = job.get()

        # Add keywords to data
        texts.append('; '.join(keywords))

        # Add to keywords
        keywords += researchers[urlId]['keywords']
        researchers[urlId]['keywords'] = keywords

    # Close pool to free up resources
    gs_pool.close()
    #print('2 - google scholar done')

    # Check time
    toc = time.perf_counter()
    #print(f"Google Scholar finished in {(toc - tic)/60:0.0f} minutes {(toc - tic)%60:0.0f} seconds")
    #print(f"Google Scholar finished in {toc - tic:0.4f} seconds")

    # Handle grant jobs (won't run if empty)
    for urlId, job in grant_jobs:
        # Get output
        res = job.get()

        # Get grants
        researchers[urlId]['grants'] = res[0]
        researchers[urlId]['grant_keywords'] = res[1]

    # close pool to free up resources
    grant_pool.close()
    #print('3 - grants done')

    # check time
    toc = time.perf_counter()
    #print(f"Grants finished in {(toc - tic)/60:0.0f} minutes {(toc - tic)%60:0.0f} seconds")
    #print(f"Grants inished in {toc - tic:0.4f} seconds")

    # Handle pub jobs (won't run if empty)
    for urlId, job in pub_jobs:
        # get output
        res = job.get()

        # Get pubs
        researchers[urlId]['pubs'] = res[0]
        researchers[urlId]['pubs_keywords'] = res[1]

    # close pool to free up resources
    pub_pool.close()

    #print('4 - pubs done')

    # check time
    toc = time.perf_counter()
    #print(f"Pubs finished in {(toc - tic)/60:0.0f} minutes {(toc - tic)%60:0.0f} seconds")
    #print(f"Pubs finished in {toc - tic:0.4f} seconds")

    #print(researchers)
    if 'clusters' in affectedFields:
        # CLUSTERS
        # Initialise the sentence transformer model
        model = SentenceTransformer('all-MiniLM-L6-v2')

        # Generate clusters
        kmeans, clusters, vectorizer = get_categories(texts, num_clusters=maxNumber)

        # Generate names for clusters
        clusters_dictionary, categories = get_top_keywords(kmeans, vectorizer.get_feature_names_out())

        # Check time
        toc = time.perf_counter()
        #print(f"Clusters finished in {(toc - tic)/60:0.0f} minutes {(toc - tic)%60:0.0f} seconds")
        #print(f"Clusters finished in {toc - tic:0.4f} seconds")

        # Embed for sentence transformers
        category_embeddings = model.encode(categories, convert_to_tensor=True)

        # Match researchers to clusters
        for urlId in researchers:
            researchers[urlId]['clusters'] = researcher_clusters('; '.join(researchers[urlId]['keywords']), model, category_embeddings, categories, clusterRangeSetting, strictness)

        # Check time
        toc = time.perf_counter()
        #print(f"Build finished in {(toc - tic)/60:0.0f} minutes {(toc - tic)%60:0.0f} seconds")
        #print(f"Build finished in {toc - tic:0.4f} seconds")
        return researchers, clusters_dictionary
    
    return researchers, None
'''
# get the information from nodejs
affectedFields = json.loads(sys.argv[1])
affectedResearchers = json.loads(sys.argv[2])
maxNumber = int(sys.argv[3])
strictness = float(sys.argv[4])
clusterRangeSetting = float(sys.argv[5])
googlescholar = sys.argv[6]

# process the information from nodejs
if googlescholar == 'yes':
    googlescholar = True
else:
    googlescholar = False

if len(affectedResearchers) == 0:
    affectedResearchers = 'all'

'''
# Default values for testing purposes
affectedResearchers = 'all'
affectedFields = ['keywords', 'clusters']
clusterRangeSetting = 0.15
strictness = 0.25
maxNumber = 50
googlescholar = True


url = "https://www.sydney.edu.au/AcademicProfiles/interfaces/rest/performSimpleAttributeSearch/+jobType:1%20+orgUnitCode:5000053020L0000%20+isMediaExpert:true/0/270/byRelevance/false"
researchers, clusters = main(affectedResearchers, affectedFields, clusterRangeSetting, strictness, maxNumber, googlescholar, url)
sys.stdout.write(json.dumps(researchers)) # output