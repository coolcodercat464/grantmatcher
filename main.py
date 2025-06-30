'''import sys
import json


clusters = sys.argv[1].split(",")
matchTo = "biology"

result = { 'result': cluster_match(clusters, matchTo) }

sys.stdout.write(json.dumps(result))



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
    model = SentenceTransformer("all-MiniLM-L6-v2")

clusters = sys.argv[1].split(",")
matchTo = "biology"

result = { 'result': cluster_match(model, clusters, matchTo) }

sys.stdout.write(json.dumps(result))