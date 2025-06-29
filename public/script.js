// HEADER TRANSITIONS
// run scrollFunction() when the user has scrolled
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  // if the user scrolled below a certain point
  if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
    // hide the links (this might seem like a detour, but it allows for a transition since display: none doesn't result in a smooth transition)
    document.getElementById("navbarNav").classList.add("hidden");
    document.getElementById("navbarNav").style.setProperty("visibility", "hidden", "important");
    document.getElementById("navbarNav").style.opacity = '0';
    document.getElementById("navbar-toggler").style.opacity = '0';
    
    // make the brand smaller
    document.getElementById("navbar-brand").classList.add("smallBrand");
    document.getElementById("navbar-brand").classList.remove("bigBrang");
  // otherwise,
  } else {
    // show the links (this might seem like a detour, but it allows for a transition since display: none doesn't result in a smooth transition)
    document.getElementById("navbarNav").classList.remove("hidden");
    document.getElementById("navbarNav").style.visibility = 'visible';
    document.getElementById("navbarNav").style.opacity = '1';
    document.getElementById("navbar-toggler").style.opacity = '1';
    
    // make the brand bigger
    document.getElementById("navbar-brand").classList.add("bigBrand");
    document.getElementById("navbar-brand").classList.remove("smallBrand");
  }
}

// TODO: Don't keep in this file. Move it to the <script></script> thing in the HTML file
/* 
DATA STRUCTURE JUSTIFICATION - Dictionary of Lists of Dictionaries:
Makes it easy to access the data for a particular accordion based on the accordion's
number. The list of dictionaries represents the accordion's items, where each dictionary
in the list represents the data for one item. This is a logical structure that ensures
that the data is easy to access.
*/

// contains all the data for the accordions
// TODO: remove HTML and replace with fields
accordionData = {
    "1": [
            {
                "title": "Accordion #1",
                "html": "<b>Test1</b> <i>yippeee</i>",
                "id": 1
            },
            {
                "title": "Accordion #2",
                "html": "<b>Test2</b> <i>yippeee</i>",
                "id": 2
            },
            {
                "title": "Accordion #3",
                "html": "<b>Test3</b> <i>yippeee</i>",
                "id": 3
            }
        ],
    "2": [
        {
            "title": "Accordion #4",
            "html": "<b>Test4</b> <i>yippeee</i>",
            "id": 1
        },
        {
            "title": "Accordion #5",
            "html": "<b>Test5</b> <i>yippeee</i>",
            "id": 2
        },
        {
            "title": "Accordion #6",
            "html": "<b>Test6</b> <i>yippeee</i>",
            "id": 3
        }
    ]
}

// ACCORDIONS
// get all accordions on the page
accordions = document.getElementsByClassName("accordion")
// goes through each accordion item represented by the accordionData list
for (var i = 0; i < accordions.length; i++) {
    // get the accordion's information
    accordion = accordions[i]
    accordionNumber = accordion.id.replace("accordion", "")
    
    // loop through each item in the accordion
    for (j in accordionData[accordionNumber]) {
        // get the information from the dictionary
        title = accordionData[accordionNumber][j]["title"]
        html = accordionData[accordionNumber][j]["html"]
        id = accordionData[accordionNumber][j]["id"]

        // create the HTML to display the accordion item on the main page
        accordionItem = `<div class="accordion-item">
            <h2 class="accordion-header" id="heading${accordionNumber}-${id}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${accordionNumber}-${id}" aria-expanded="true" aria-controls="collapse${accordionNumber}-${id}">
                ${title}
            </button>
            </h2>
            <div id="collapse${accordionNumber}-${id}" class="accordion-collapse collapse" aria-labelledby="heading${accordionNumber}-${id}" data-bs-parent="#accordionExample">
            <div class="accordion-body">
                ${html}
            </div>
            </div>
        </div>`

        // add the accordion item to the accordion
        document.getElementById(accordion.id).innerHTML += accordionItem
    }
}

// CLUSTERS
// get the cluster dictionary by ID
function getClusterByID(id) {
    // loop through clustersData
    for (x in clustersData) {
        if (clustersData[x].id == id) {
            return clustersData[x]
        }
    }
    // return empty dictionary if none found
    return {}
}

// MOVING CLUSTERS IN CLUSTER SELECTORS
// select a cluster from the unselected list
function selectCluster(buttonId) {
    // remove it from the unselected list
    document.getElementById(buttonId).remove()

    // get the selector number (see the previous for loop for more details)
    buttonId = buttonId.split('U')
    selectorNumber = buttonId[0] 
    clusterId = buttonId[1]

    // find the cluster from clustersData that is 
    clusterName = undefined
    for (x in clustersData) {
        c = clustersData[x]
        if (c['id'] == clusterId) {
            clusterName = c.name
            break
        }
    }

    // create html for that selected cluster
    clusterHTML = `<button class='selectedClusterButton' id='${selectorNumber}S${clusterId}' onclick="unselectCluster('${selectorNumber}S${clusterId}')">${clusterName}</button>`

    // add it to the appropriate selected cluster list
    newSelectorId = 'selectedClusters' + selectorNumber
    newSelector = document.getElementById(newSelectorId)
    newSelector.innerHTML += clusterHTML
}

// same logic as the selecting a cluster, but instead we are moving the cluster
// from the selected list to the unselected list
function unselectCluster(buttonId) {
    document.getElementById(buttonId).remove()

    buttonId = buttonId.split('S')
    selectorNumber = buttonId[0] 
    clusterId = buttonId[1]

    clusterName = undefined
    for (x in clustersData) {
        c = clustersData[x]
        if (c['id'] == clusterId) {
            clusterName = c.name
            break
        }
    }

    clusterHTML = `<button class='unselectedClusterButton' id='${selectorNumber}U${clusterId}' onclick="selectCluster('${selectorNumber}U${clusterId}')">${clusterName}</button>`
    
    newSelectorId = 'unselectedClusters' + selectorNumber
    newSelector = document.getElementById(newSelectorId)
    newSelector.innerHTML += clusterHTML
}

// SEARCHING IN THE CLUSTER SELECTORS
// get all the names of the clusters in the unselected list
function getUnselectedClusterNames(selectorId) {
    // get all elements in the list
    selector = document.getElementById("unselectedClusters" + selectorId)
    clusters = selector.getElementsByClassName("unselectedClusterButton")
    clusterNames = []
    clusterIds = []

    // get the name and cluster ID from those elements
    for (var i = 0; i < clusters.length; i ++) {
        clusterNames.push(clusters[i].textContent)
        clusterIds.push(clusters[i].id)
    }

    return [clusterNames, clusterIds]
}

// find a cluster from the list of unselected clusters
function findUnselectedCluster(selectorId) {
    // get all the unselected clusters
    clusters = getUnselectedClusterNames(selectorId)
    clusterNames = clusters[0]
    clusterIds = clusters[1]

    // get the search field
    searchField = document.getElementById("searchUnselectedClusters" + selectorId).value.toLowerCase()

    // initialise lists
    excluded = []
    included = []

    // go through each item in the list of all clusters and then check if it matches the search field
    // add it to included if it does and excluded if it doesnt
    for (var i = 0; i < clusterNames.length; i ++) {
        clusterName = clusterNames[i].toLowerCase()
        if (clusterName.indexOf(searchField) == -1) {
            excluded.push(clusterIds[i])
        } else {
            included.push(clusterIds[i])
        }
    }

    // hide all the clusters in the excluded list
    for (var i = 0; i < excluded.length; i ++) {
        document.getElementById(excluded[i]).classList.add("hidden");
    }

    // show all the clusters in the included list
    for (var i = 0; i < included.length; i ++) {
        document.getElementById(included[i]).classList.remove("hidden");
    }
}

// reset the search and show all clusters in the unselected cluster list
function resetUnselectedClusterSearch(selectorId) {
    // make the search field an empty string and use the search function
    document.getElementById("searchUnselectedClusters" + selectorId).value = ''
    findUnselectedCluster(selectorId)
}

// same logic as getting all unselected cluster names
// but this time we are doing it on the selected list
function getSelectedClusterNames(selectorId) {
    selector = document.getElementById("selectedClusters" + selectorId)
    clusters = selector.getElementsByClassName("selectedClusterButton")
    clusterNames = []
    clusterIds = []

    for (var i = 0; i < clusters.length; i ++) {
        clusterNames.push(clusters[i].textContent)
        clusterIds.push(clusters[i].id)
    }

    return [clusterNames, clusterIds]
}

// same logic as finding clusters from the unselected list,
// but this time we are doing it on the selected list
function findSelectedCluster(selectorId) {
    clusters = getSelectedClusterNames(selectorId)
    clusterNames = clusters[0]
    clusterIds = clusters[1]

    searchField = document.getElementById("searchSelectedClusters" + selectorId).value.toLowerCase()
    excluded = []
    included = []

    for (var i = 0; i < clusterNames.length; i ++) {
        clusterName = clusterNames[i].toLowerCase()
        if (clusterName.indexOf(searchField) == -1) {
            excluded.push(clusterIds[i])
        } else {
            included.push(clusterIds[i])
        }
    }

    for (var i = 0; i < excluded.length; i ++) {
        document.getElementById(excluded[i]).classList.add("hidden");
    }

    for (var i = 0; i < included.length; i ++) {
        document.getElementById(included[i]).classList.remove("hidden");
    }
}

// same logic as resetting for the unselected cluster list,
// but this time we are doing it for the selected list
function resetSelectedClusterSearch(selectorId) {
    document.getElementById("searchSelectedClusters" + selectorId).value = ''
    findSelectedCluster(selectorId)
}

// KEYWORD SELECTOR STUFF
// add a keyword to a keyword selector
function addKeyword(id) {
    // get the list and inputs based on the ID number
    ul = document.getElementById('list' + id)
    input = document.getElementById('keyword' + id)
    keyword = input.value

    // user the number of keywords to determine the background color of the next item in the list
    numKeywords = ul.querySelectorAll('li').length
    if (numKeywords % 2 == 0) {
        keywordElement = `<li id='kw${id}-${numKeywords}' class='listboxliwhite'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${numKeywords})"></i> ${keyword}</li>`
    } else {
        keywordElement = `<li id='kw${id}-${numKeywords}' class='listboxligray'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${numKeywords})"></i> ${keyword}</li>`
    }
    
    // add the new keyword to the list
    ul.innerHTML += keywordElement
}

// remove a keyword from a keyword selector
function deleteKeyword(id, kwid) {
    // find the element and remove it
    element = document.getElementById('kw' + id + '-' + kwid)
    element.remove()

    // find the list based on the ID number
    ul = document.getElementById('list' + id)

    // recalculate all of the background colors of the elements
    // after the keyword that was deleted
    numKeywords = ul.querySelectorAll('li').length
    for (let i = kwid+1; i <= numKeywords; i++) {
        // get the element and remove it
        element = document.getElementById('kw' + id + '-' + i)
        keyword = element.textContent
        element.remove()
        
        // replace it with an element that has a different background color
        if ((i+1) % 2 == 0) {
            keywordElement = `<li id='kw${id}-${i-1}' class='listboxliwhite'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${i-1})"></i>${keyword}</li>`
        } else {
            keywordElement = `<li id='kw${id}-${i-1}' class='listboxligray'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${i-1})"></i>${keyword}</li>`
        }

        ul.innerHTML += keywordElement
    }
}

// MODAL METHOD
// open a modal
function openModal(id) {
    // get all the relevant elements to show based on the ID number
    var modal = document.getElementById("modal" + id);
    var span = document.getElementById("close" + id);
    var cancel = document.getElementById("cancel" + id);

    // show the modal
    modal.style.display = "block";

    // close the modal if the close button (X) is clicked
    span.onclick = function() {
        modal.style.display = "none";
    }

    // if a cancel button exists (for user control / confirmation), close the modal if it is clicked
    if (cancel != null) {
        cancel.onclick = function() {
            modal.style.display = "none";
        }
    }

    // close the modal if the outside is clicked
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

// SORTING FOR CLUSTER SELECTORS
// quicksort - partition the list
function partition(arr, low, high, field) {
    // find the pivot's value
    // the pivot is the highest index in the list
    let pivot = arr[high][field];
    let i = low - 1;

    // iterate through the list
    for (let j = low; j <= high - 1; j++) {
        // everything less than the pivot should have a lower index than the pivot
        // increment i (which wil become the last number in the lower half of the list)
        if (arr[j][field] < pivot) {
            i++;
            [arr[i], arr[j]] = [arr[j], arr[i]]; 
        }
    }

    // then the pivot is i+1
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]; 
    return i + 1;
}

// quicksort - recursive function
function quickSort(arr, low, high, field) {
    // ensure that low < high
    if (low >= high) return;

    // create a partition
    let pi = partition(arr, low, high, field);

    // sort the top half
    quickSort(arr, low, pi - 1, field);

    // sort the bottom half
    quickSort(arr, pi + 1, high, field);
}

// use the quicksort recursion to sort a list of dictionaries
function sortDictionaryList(dictionaryList, field) {
    // makes sure the original value isn't changed
    arr = dictionaryList
    // sort it (arr is changed)
    quickSort(arr, 0, arr.length - 1, field);
    // return the sorted value
    return arr
}

// sort an unselected cluster list
function sortUnselected(selectorNumber) {
    // get the new sort value
    const selectedValue = event.target.value

    // get all cluster names
    clusters = getUnselectedClusterNames(selectorNumber)

    // turn the cluster IDs into numbers (e.g., 2U5 becomes 5 because 2 represents the selector number, not the actual cluster ID)
    clusterIds = clusters[1]
    for (x in clusterIds) {
        clusterIds[x] = parseInt(clusterIds[x].split('U')[1])
    }

    // this should be a list of dictionaries in the same format as clustersData
    unselectedClusterData = []

    // loop through clustersData and only add clusters to unselectedClusterData
    // if its ID is in the clusterIds list
    for (x in clustersData) {
        if (clusterIds.includes(clustersData[x]["id"])) {
            unselectedClusterData.push(clustersData[x])
        }
    }

    // sort the list according to the field selected in the dropdown
    unselectedClusterData = sortDictionaryList(unselectedClusterData, selectedValue)

    // remove all items in the cluster list
    unselectedClustersDiv = document.getElementById('unselectedClusters' + selectorNumber)
    unselectedClustersDiv.innerHTML = '';

    // and replace it with the clusters in the new correct order
    // note that this code is the same as when the unselected lists
    // got initialised in the beginning of the code
    clusterHTML = ''
    for (x in unselectedClusterData) {
        c = unselectedClusterData[x]
        clusterName = c.name
        clusterId = c['id']
        clusterHTML += `<button class='unselectedClusterButton' id='${selectorNumber}U${clusterId}' onclick="selectCluster('${selectorNumber}U${clusterId}')">${clusterName}</button>`
    }

    unselectedClustersDiv.innerHTML += clusterHTML;
}

// sort a selected cluster list
// logic is exactly the same as sorting unselected lists
function sortSelected(selectorNumber) {
    const selectedValue = event.target.value
    clusters = getSelectedClusterNames(selectorNumber)

    clusterIds = clusters[1]
    for (x in clusterIds) {
        // note that the selected cluster lists, the separator is 'S' not 'U'
        clusterIds[x] = parseInt(clusterIds[x].split('S')[1])
    }

    selectedClusterData = []

    for (x in clustersData) {
        if (clusterIds.includes(clustersData[x]["id"])) {
            selectedClusterData.push(clustersData[x])
        }
    }

    selectedClusterData = sortDictionaryList(selectedClusterData, selectedValue)

    selectedClustersDiv = document.getElementById('selectedClusters' + selectorNumber)
    selectedClustersDiv.innerHTML = '';

    clusterHTML = ''
    for (x in selectedClusterData) {
        c = selectedClusterData[x]
        clusterName = c.name
        clusterId = c['id']
        clusterHTML += `<button class='selectedClusterButton' id='${selectorNumber}S${clusterId}' onclick="unselectCluster('${selectorNumber}S${clusterId}')">${clusterName}</button>`
    }

    selectedClustersDiv.innerHTML += clusterHTML;
}

// PAGINATED TABLES
const rowsPerPage = 5;

/* 
DATA STRUCTURE JUSTIFICATION - Dictionary of Dictionaries:
Allows the app to access the data from a particular table easily. Unlike
for the cluster data, we don't need to sort each table based on the values
(instead we just sort the dataSet value), but we need to reference the 
table number a lot. Thus making the table number the key makes it very 
efficient to access the table's data and information. This allows for my 
presentation layer to include multiple tables which all work.
*/

// actual data calculated later on
tableData = {
    1 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    2 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    3 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    4 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    5 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
}

// present the table
function renderTable(tableNumber) {
    // get all relevant elements based on the table number
    tableBody = document.getElementById('tableBody' + tableNumber);
    firstBtn = document.getElementById('firstNav' + tableNumber);
    prevBtn = document.getElementById('prevNav' + tableNumber);
    nextBtn = document.getElementById('nextNav' + tableNumber);
    lastBtn = document.getElementById('lastNav' + tableNumber);

    // get the information to present based on the current page
    tableBody.innerHTML = '';
    const start = (tableData[tableNumber]["currentPage"] - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageItems = tableData[tableNumber]["showRows"].slice(start, end);
    tableData[tableNumber].totalPages = Math.ceil(tableData[tableNumber]["showRows"].length / rowsPerPage)

    // present the data
    document.getElementById('pageStats' + tableNumber).textContent = `Page ${tableData[tableNumber]["currentPage"]} / ${tableData[tableNumber]["totalPages"]}`

    pageItems.forEach(item => {
        // make the HTML for the row
        row = '<tr>'
        // get the column names (only show some columns)
        columns = tableData[tableNumber].showFields

        for (c in columns) {
            col = columns[c]
            // get the value of item for that column
            value = item[col]
            row += `<td>${value}</td>`
        }
        row += '</tr>'

        tableBody.insertAdjacentHTML('beforeend', row);
    });

    // find which buttons are disabled
    updateButtons(tableNumber);
}

// disabled buttons that the user can't press
function updateButtons(tableNumber) {
    // get all the buttons based on the tableNumber
    firstBtn = document.getElementById('firstNav' + tableNumber);
    prevBtn = document.getElementById('prevNav' + tableNumber);
    nextBtn = document.getElementById('nextNav' + tableNumber);
    lastBtn = document.getElementById('lastNav' + tableNumber);

    // get the current page and the total number of pages
    currentPage = tableData[tableNumber]["currentPage"]
    totalPages = tableData[tableNumber]["totalPages"]

    // disable the buttons if they can't be used based
    // on the current page out of the total number of
    // pages
    firstBtn.disabled = currentPage === 1;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    lastBtn.disabled = currentPage === totalPages;
}

// go to the first page
function goToFirst(tableNumber) {
    // change the current page
    tableData[tableNumber]["currentPage"] = 1;
    // render the table
    renderTable(tableNumber);
}

// same as the previous function, but
// going to be previous page
function goToPrev(tableNumber) {
    tableData[tableNumber]["currentPage"]--;
    renderTable(tableNumber);
}

// same as the previous function, but
// going to be next page
function goToNext(tableNumber) {
    tableData[tableNumber]["currentPage"]++;
    renderTable(tableNumber);
}

// same as the previous function, but
// going to be last page
function goToLast(tableNumber) {
    tableData[tableNumber]["currentPage"] = tableData[tableNumber]["totalPages"];
    renderTable(tableNumber);
}

// sort the contents of a table based on the table number
function sortTable(tableNumber) {
    // get the new sort value
    const selectedValue = document.getElementById("sortTable" + tableNumber).value

    // get all data in the table
    values = tableData[tableNumber].showRows

    // sort the list according to the field selected in the dropdown
    values = sortDictionaryList(values, selectedValue)

    // refresh the table
    renderTable(tableNumber)
}

// SEARCHING
// filter through the researchers table
function searchResearcher(tableNumber) {
    // get the relevant data
    researcherTable = tableData[tableNumber]
    researcherData = researcherTable.dataSet

    // get the text inputs
    researcherName = document.getElementById('researcherName').value
    researcherEmail = document.getElementById('researcherEmail').value

    // get the dropdown inputs
    school = document.getElementById('school').value
    gender = document.getElementById('gender').value
    career = document.getElementById('career').value

    // get the numeric inputs
    lower = document.getElementById('lower').value

    // if not given, then the lower bound is 0
    if (lower == '') { lower = 0 }

    higher = document.getElementById('higher').value

    // if not given, then the higher bound is 1
    if (higher == '') { higher = 1 }

    // get the selected clusters
    selectedClusters = document.getElementById('selectedClusters1')
    selectedClusters = selectedClusters.getElementsByTagName('button') // list of each cluster (element)

    // get a list of all the clusters
    selectedClustersText = [] // list of each cluster (text)
    for (var i = 0; i < selectedClusters.length; i++) {
        selectedCluster = selectedClusters[i]
        selectedClustersText.push(selectedCluster.textContent)
    }

    // get the inputted keywords
    keywords = document.getElementById('list1')
    keywords = keywords.getElementsByTagName('li') // list of each keyword (element)

    // get a list of all the keywords
    keywordsText = [] // list of each keyword (text)
    for (var i = 0; i < keywords.length; i++) {
        keyword = keywords[i].textContent.trim().toLowerCase() // ensure that its trimmed and lower-cased
        keywordsText.push(keyword)
    }

    // reset the visible row list
    tableData[tableNumber].showRows = []

    // loop through each data row
    for (var i = 0; i < researcherData.length; i++) {
        // this is the particular data row
        // we are checking to see if we should add it to the
        // visible list (showRows)
        researcher = researcherData[i]

        // if the resarcher's name contains the inputted name, then they are included
        nameCorrect = researcher.name.includes(researcherName)
        emailCorrect = researcher.email.includes(researcherEmail)

        // if the dropdown is set to 'all', then its true. otherwise, the researcher
        // should match that column
        schoolCorrect = (school == "all" || researcher.school == school)
        genderCorrect = (gender == "all" || researcher.gender == gender)

        // note that career stage is either 1, 2, 3, or 4. 1 is post-doc, 2 is ecr,
        // 3 is mcr, and 4 is senior researcher. this is to make sorting easier. it will
        // be converted between the number and text form throughout the app
        careerCorrect = (career == "all" || researcher.careerStage == career) 

        // ensure the activity is within the set range
        activityCorrect = (researcher.activity >= lower && researcher.activity <= higher)

        // if the cluster list is empty, then set this to true
        clusterCorrect = (selectedClustersText.length == 0)
        console.log(selectedClustersText)
        // loop through each of the researcher's clusters
        for (x in researcher.clusters) {
            cl = researcher.clusters[x] // this isn't a string, but an id
            cl = getClusterByID(cl) // this isn't a string, but a dictionary
            cl = cl.name // finally this is a string

            // check if the cluster is in the selected clusters list
            if (selectedClustersText.includes(cl)) {
                // once such a pair found, it matches and no further searching is necessary
                clusterCorrect = true
                break
            }
        }

        // if the keywords list is empty, then set this to true
        keywordCorrect = (keywordsText.length == 0)
        // loop through each of the researcher's keywords
        for (x in researcher.keywords) {
            kw = researcher.keywords[x].toLowerCase()
            // loop through each of the inputted keywords
            for (y in keywordsText) {
                skw = keywordsText[y]
                // either the inputted one must include the researcher's one
                // or the researcher's one includes the inputted one
                if (skw.includes(kw) || kw.includes(skw)) {
                    // once such a pair found, it matches and no further searching is necessary
                    keywordCorrect = true
                    break
                }
            }
        }

        // only make the row visible if it matches for all of the user inputs
        if (nameCorrect && emailCorrect && schoolCorrect && genderCorrect && careerCorrect && activityCorrect && clusterCorrect && keywordCorrect) {
            tableData[tableNumber].showRows.push(researcher)
            console.log(researcher)
        }
    }

    // reset the table
    renderTable(tableNumber)

    // close the modal
    var modal = document.getElementById("modal2");
    modal.style.display = "none";
}

// SERVER DATABASE CALLS
/*
DATA STRUCTURE JUSTIFICATION - List of Dictionaries:
Allows the program to loop through it and sort it easily. This
is also the format it would come in once I call the database, 
thus reducing the processing time.
*/

clustersData = [] // list of dictionaries

// does two things at once - initialises the tables AND also initialises the cluster
// selectors. this improves efficiency
fetch('/db/researchers').then(response => response.json()).then(data => {
    for (var i = 0; i < data.length; i++) {
        row = data[i]

        // the name should be a link
        uniqueId = row.email.split("@")[0].replace(".", "")
        row.nameLink = `<a href='/researcher/${uniqueId}'>${row.name}</a>`

        // get the number of edits (for sorting)
        if (row.versionInformation == null) {
            row.editNumber = 0
        } else {
            row.editNumber = row.versionInformation.length
        }

        // add to the table data
        tableData[1].dataSet.push(row)
        tableData[1].showRows.push(row)
        tableData[1].showFields = ['nameLink', 'keywords', 'activity']
    }
    tableData[1].totalPages = Math.ceil(data.length / rowsPerPage)
    renderTable(1)

    // THIS FETCH IS INSIDE HERE because it needs the researchers data
    // to calculate how many researchers each cluster has
    fetch('/db/clusters').then(response => response.json()).then(clusterData => {
        for (var i = 0; i < clusterData.length; i++) {
            row = clusterData[i]

            rowDictionary = {}

            // store the data in the row dictionary (will be appended the the clustersData variable)
            rowDictionary.id = row.clusterID
            rowDictionary.name = row.name
            times = 0

            for (x in data) {
                researcher = data[x]
                if (researcher.clusters.includes(row.name)) {
                    times += 1;
                }
            }

            // add it to the data
            row.numberResearchers = times
            rowDictionary.number = times
            clustersData.push(rowDictionary)

            // add to the table data
            tableData[3].dataSet.push(row)
            tableData[3].showRows.push(row)
            tableData[3].showFields = ['clusterID', 'name', 'numberResearchers']
        }

        // initialise cluster table
        tableData[3].totalPages = Math.ceil(clusterData.length / rowsPerPage)
        renderTable(3)

        // INITIALISE CLUSTER SELECTORS
        // get all the lists of unselected clusters
        unselectedClustersDivs = document.getElementsByClassName('unselectedClusters')

        // initialise the list by adding all the cluster data to the unselected cluster (no clusters selected at the beginning)
        for (var i = 0; i < unselectedClustersDivs.length; i++) {
            // get the number of the div (e.g., the number is 5 for a div with an ID called unselectedClusters5)
            selectorNumber = unselectedClustersDivs[i].id.replace("unselectedClusters", "")
            // this string holds the HTMl code for the cluster list
            clusterHTML = ''
            for (x in clustersData) {
                // create a single HTML button for each button and add it to the total list
                c = clustersData[x]
                clusterName = c.name
                clusterId = c['id']
                clusterHTML += `<button class='unselectedClusterButton' id='${selectorNumber}U${clusterId}' onclick="selectCluster('${selectorNumber}U${clusterId}')">${clusterName}</button>`
            }
            unselectedClustersDivs[i].innerHTML += clusterHTML;
        }
    })
})

fetch('/db/grants').then(response => response.json()).then(data => {
    for (var i = 0; i < data.length; i++) {
        row = data[i]
        // the name should be a link
        uniqueId = row.grantID
        row.nameLink = `<a href='/grant/${uniqueId}'>${row.grantName}</a>`

        // reformat date so its easier to sort
        row.deadlineReformatted = row.deadline.split('-').reverse().join('/')

        // get the number of researchers
        row.researcherNumber = row.researchers.length

        // add to the table data
        tableData[2].dataSet.push(row)
        tableData[2].showRows.push(row)
        tableData[2].showFields = ['nameLink', 'keywords', 'deadline', 'matched']
    }
    tableData[2].totalPages = Math.ceil(data.length / rowsPerPage)
    renderTable(2)
})

fetch('/db/users').then(response => response.json()).then(data => {
    for (var i = 0; i < data.length; i++) {
        row = data[i]

        // reformat date so its easier to sort
        row.dateReformatted = row.dateJoined.split('-').reverse().join('/')

        // add to the table data
        tableData[4].dataSet.push(row)
        tableData[4].showRows.push(row)
        tableData[4].showFields = ['name', 'email', 'role', 'xp']
    }
    tableData[4].totalPages = Math.ceil(data.length / rowsPerPage)
    renderTable(4)

    // THIS FETCH IS INSIDE HERE because it needs the user data
    // to find the username based on email
    fetch('/db/changelog').then(response => response.json()).then(dataChange => {
        for (var i = 0; i < dataChange.length; i++) {
            row = dataChange[i]
            row.username = undefined

            // loop through to find the user's name based on email
            for (x in data) {
                if (data[x].email == row.userEmail) {
                    row.username = data[x].name;
                    break;
                }
            }

            // reformat date so its easier to sort
            row.dateReformatted = row.date.split('-').reverse().join('/')

            // add to the table data
            tableData[5].dataSet.push(row)
            tableData[5].showRows.push(row)
            tableData[5].showFields = ['date', 'type', 'username']
        }
        tableData[5].totalPages = Math.ceil(dataChange.length / rowsPerPage)
        renderTable(5)
    })
})
