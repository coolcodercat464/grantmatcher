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
// get all keywords in a keyword selector
function getKeywords(id) {
    // get the list based on the ID number
    ul = document.getElementById('list' + id)
    keywordList = ul.getElementsByTagName('li') // all the keywords (elements)
    keywordListText = [] // all the keywords (string)

    // get the string value of each keyword
    for (var i = 0; i < keywordList.length; i++) {
        keyword = keywordList[i]
        keywordListText.push(keyword.textContent.trim())
    }

    return keywordListText
}

// add the keyword in the input field to a keyword selector
function addKeyword(id) {
    // get the input based on the ID number
    input = document.getElementById('keyword' + id)
    keyword = input.value

    // add the keyword
    addKeywordManual(id, keyword)
}

// add an editable keyword in the input field to a keyword selector
function addEditableKeyword(id) {
    // get the input based on the ID number
    input = document.getElementById('keyword' + id)
    keyword = input.value

    // add the keyword
    addEditableKeywordManual(id, keyword)
}

// add a keyword (from the function parameters) to a keyword selector
function addKeywordManual(id, keyword) {
    // get the list based on the ID number
    ul = document.getElementById('list' + id)

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

// add an editable keyword (from the function parameters) to a keyword selector
function addEditableKeywordManual(id, keyword) {
    // get the list based on the ID number
    ul = document.getElementById('list' + id)

    // user the number of keywords to determine the background color of the next item in the list
    numKeywords = ul.querySelectorAll('li').length
    if (numKeywords % 2 == 0) {
        keywordElement = `<li id='kw${id}-${numKeywords}' contenteditable="true" class='listboxliwhite'>${keyword}</li>`
    } else {
        keywordElement = `<li id='kw${id}-${numKeywords}' contenteditable="true" class='listboxligray'>${keyword}</li>`
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
    // researchers
    1 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // grants
    2 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // clusters
    3 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // users
    4 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // changelog
    5 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // researchers (match)
    6 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // researchers (before recalculate)
    7 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // researchers (after recalculate)
    8 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
    // codes (manage codes page)
    8 : {
        "dataSet": [],
        "currentPage": 1,
        "totalPages": 1,
        "showFields": [],
        "showRows": []
    },
}

function dbclickRow(tableNumber, id, idField, dbclick) {
    dataSet = tableData[tableNumber].dataSet
    correctRow = [] // this will store the row that has been clicked

    // find the correct row based on the id
    for (x in dataSet) {
        row = dataSet[x]
        if (row[idField] == id) {
            correctRow = row;
            break
        }
    }

    // if no row has been found (correctRow is still empty list)
    if (correctRow == []) {
        console.log("ERROR - No row found.")
        return
    }

    // open the details in the modal
    document.getElementById("doubleclickdetails").textContent = row[dbclick]
    openModal(9)
}

// present the table
function renderTable(tableNumber, dbclick=null, idField=null) {
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

    for (var i = 0; i < pageItems.length; i++) {
        // get the row information
        item = pageItems[i]

         if (dbclick != null) {
            // make the HTML for the row (with id)
            id = item[idField]

            // check if the idField is provided. reset dbclick if it isnt provided
            if (idField == null) {
                console.log("ERROR - if dbclick isn't null, an idField must be provided!")
                dbclick = null
                row = '<tr>'
            } else {
                row = `<tr ondblclick="dbclickRow(${tableNumber}, ${id}, '${idField}', '${dbclick}')">`
            }
        } else {
            // make the HTML for the row (without id)
            row = `<tr>`
        }

        // get the column names (only show some columns)
        columns = tableData[tableNumber].showFields

        for (c in columns) {
            col = columns[c]

            // if this should be a checkbox, not an actual value...
            if (col == 'SELECT') {
                id = item[idField]
                // create a checkbox using the id

                // check if the checkbox should already be selected or not
                if (item.selected) {
                    // select it by default
                    row += `<td><input type="checkbox" id="select-${tableNumber}-${id}" onclick="handleSelection('${tableNumber}-${id}')" checked></td>`
                } else {
                    row += `<td><input type="checkbox" id="select-${tableNumber}-${id}" onclick="handleSelection('${tableNumber}-${id}')"></td>`
                }
                
                break
            }

            // get the value of item for that column
            value = item[col]
            row += `<td><div style="width:100%; max-height:100px; overflow:auto">${value}</div></td>`
        }
        row += '</tr>'

        tableBody.insertAdjacentHTML('beforeend', row);
    };

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
function goToFirst(tableNumber, dbclick=null, idField=null) {
    // change the current page
    tableData[tableNumber]["currentPage"] = 1;
    // render the table (the parameters ensure that you can still double-click
    // on the all pages)
    renderTable(tableNumber, dbclick=dbclick, idField=idField);
}

// same as the previous function, but
// going to be previous page
function goToPrev(tableNumber, dbclick=null, idField=null) {
    tableData[tableNumber]["currentPage"]--;
    renderTable(tableNumber, dbclick=dbclick, idField=idField);
}

// same as the previous function, but
// going to be next page
function goToNext(tableNumber, dbclick=null, idField=null) {
    tableData[tableNumber]["currentPage"]++;
    renderTable(tableNumber, dbclick=dbclick, idField=idField);
}

// same as the previous function, but
// going to be last page
function goToLast(tableNumber, dbclick=null, idField=null) {
    tableData[tableNumber]["currentPage"] = tableData[tableNumber]["totalPages"];
    renderTable(tableNumber, dbclick=dbclick, idField=idField);
}

// sort the contents of a table based on the table number
function sortTable(tableNumber, dbclick=null, idField=null) {
    // get the new sort value
    const selectedValue = document.getElementById("sortTable" + tableNumber).value

    // get all data in the table
    values = tableData[tableNumber].showRows

    // sort the list according to the field selected in the dropdown
    values = sortDictionaryList(values, selectedValue)

    // refresh the table
    renderTable(tableNumber, dbclick=dbclick, idField=idField)
}

// SEARCHING
// filter through the researchers table
function searchResearcher(tableNumber, dbclick=null, idField=null, searchId='') {
    // NOTE: searchId allows for multiple researcher search modals in one page (useful for recalculation page)

    // get the relevant data
    researcherTable = tableData[tableNumber]
    researcherData = researcherTable.dataSet

    // get the text inputs
    // trim and lowercase all user inputs
    researcherName = document.getElementById('researcherName' + searchId).value.trim().toLowerCase()
    researcherEmail = document.getElementById('researcherEmail' + searchId).value.trim().toLowerCase()

    // get the dropdown inputs
    school = document.getElementById('school' + searchId).value
    gender = document.getElementById('gender' + searchId).value
    career = document.getElementById('career' + searchId).value

    // get the numeric inputs
    lower = document.getElementById('lower' + searchId).value

    // if not given, then the lower bound is 0
    if (lower == '') { lower = 0 }

    higher = document.getElementById('higher' + searchId).value

    // if not given, then the higher bound is 1
    if (higher == '') { higher = 1 }

    // get the selected clusters
    selectedClusters = document.getElementById('selectedClusters1' + searchId)
    selectedClusters = selectedClusters.getElementsByTagName('button') // list of each cluster (element)

    // get a list of all the clusters
    selectedClustersText = [] // list of each cluster (text)
    for (var i = 0; i < selectedClusters.length; i++) {
        selectedCluster = selectedClusters[i]
        selectedClustersText.push(selectedCluster.textContent)
    }

    // get the inputted keywords
    keywords = document.getElementById('list1' + searchId)
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
        nameCorrect = researcher.name.trim().toLowerCase().includes(researcherName)
        emailCorrect = researcher.email.trim().toLowerCase().includes(researcherEmail)

        // if the dropdown is set to 'all', then its true. otherwise, the researcher
        // should match that column (unless they actually dont have that column)
        schoolCorrect = (school == "all" || researcher.school == school || !researcher.school)
        genderCorrect = (gender == "all" || researcher.gender == gender || !researcher.gender)

        // note that career stage is either 1, 2, 3, or 4. 1 is post-doc, 2 is ecr,
        // 3 is mcr, and 4 is senior researcher. this is to make sorting easier. it will
        // be converted between the number and text form throughout the app
        careerCorrect = (career == "all" || researcher.careerStage == career || researcher.cds == career || !researcher.cds) 

        // ensure the activity is within the set range
        activityCorrect = ((researcher.activity >= lower && researcher.activity <= higher) || !researcher.activity)

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

        // table number 6 is only for the match grants table to select researchers
        // here, we have to include the selectedCorrect
        if (tableNumber == 6) {
            selected = document.getElementById('selected' + searchId).value
            // it is true if selected is any, and if it isnt any, the selected must match researcher.selected
            selectedCorrect = (selected == "all" || (researcher.selected == true && selected == 'yes') || (researcher.selected == false && selected == 'no'))
        // we also have to consider selectedCorrect if its table number 8 (after
        // recalculation)
        } else if (tableNumber == 8) {
            selected = document.getElementById('selected' + searchId).value
            // it is true if selected is any, and if it isnt any, the selected must match researcher.selected
            selectedCorrect = (selected == "all" || (researcher.selected == true && selected == 'yes') || (researcher.selected == false && selected == 'no'))
        } else {
            selectedCorrect = true
        }

        // only make the row visible if it matches for all of the user inputs
        if (nameCorrect && emailCorrect && schoolCorrect && genderCorrect && careerCorrect && activityCorrect && clusterCorrect && keywordCorrect && selectedCorrect) {
            tableData[tableNumber].showRows.push(researcher)
            console.log(researcher)
        }
    }

    // open error modal (modal 8) if no researchers are found
    if (tableData[tableNumber].showRows.length == 0) {
        openModal(8)
    }

    // reset the table
    renderTable(tableNumber, dbclick=dbclick, idField=idField)

    // close the modal
    var modal = document.getElementById("modal2");
    modal.style.display = "none";
}

// clear the researcher form and reset the table
function resetResearcherSearch(tableNumber, dbclick=null, idField=null) {
    // get the relevant data
    researcherTable = tableData[tableNumber]
    researcherData = researcherTable.dataSet

    // reset the text inputs
    document.getElementById('researcherName').value = ''
    document.getElementById('researcherEmail').value = ''

    // reset the dropdown inputs
    document.getElementById('school').value = 'all'
    document.getElementById('gender').value = 'all'
    document.getElementById('career').value = 'all'

    // reset the numeric inputs
    document.getElementById('lower').value = ''
    document.getElementById('higher').value = ''

    // reset the keyword selector
    document.getElementById('list1').innerHTML = ''

    // get the selected clusters
    selectedClusters = document.getElementById('selectedClusters1')
    selectedClusters = selectedClusters.getElementsByTagName('button') // list of each cluster (element)
    length = selectedClusters.length // note that the length will change (we are removing stuff), so we store it here

    // reset the cluster selector by looping through the selected list and unselecting each cluster
    for (var i = 0; i < length; i++) {
        selectedCluster = selectedClusters[0] // only get rid of the first one (remember the length of selectedClusters  is decreasing)
        id = selectedCluster.id
        unselectCluster(id)
    }

    // reset the visible row list
    tableData[tableNumber].showRows = researcherData

    // reset the table
    renderTable(tableNumber, dbclick=dbclick, idField=idField)

    // close the modal
    var modal = document.getElementById("modal2");
    modal.style.display = "none";
}

// filter through the grant table
function searchGrant(tableNumber) {
    // get the relevant data
    grantTable = tableData[tableNumber]
    grantData = grantTable.dataSet

    // get the text inputs
    grantName = document.getElementById('grantName').value.trim().toLowerCase()

    // get the dropdown inputs
    user = document.getElementById('grantUser').value
    researcher = document.getElementById('grantResearcher').value

    // get the researcher email based on name
    const list = document.getElementById("grantResearcherOptions");
    const options = list.children;

    // iterate over each researcher option
    for (let option of options) {
        // get the option that is selected
        if (option.value === researcher) {
            // get their email
            researcher = option.getAttribute("data-value");
            break
        }
    }

    // get the matched dropdown input
    matched = document.getElementById('matched').value

    // turn the input into boolean
    if (matched == "yes") {
        matched = true
    } else if (matched == "no") {
        matched = false
    }

    // get the date inputs
    deadlineLower = document.getElementById('deadlineLower').value
    deadlineHigher = document.getElementById('deadlineHigher').value

    // get the numeric inputs
    durationLower = document.getElementById('durationLower').value
    durationHigher = document.getElementById('durationHigher').value

    // max and min dates in case one of the inputs isnt provided
    let maxDate = new Date(8640000000000000);
    let minDate = new Date(-8640000000000000);

    // deal with when one of the date inputs isn't provided
    if (deadlineLower == '') { deadlineLower = minDate }
    else { deadlineLower = new Date(deadlineLower) }

    if (deadlineHigher == '') { deadlineHigher = maxDate }
    else { deadlineHigher = new Date(deadlineHigher) }

    // deal with when duration isn't given
    if (durationLower == '') { durationLower = 0 }
    if (durationHigher == '') { durationHigher = Number.MAX_SAFE_INTEGER }

    // get the selected clusters
    selectedClusters = document.getElementById('selectedClusters2')
    selectedClusters = selectedClusters.getElementsByTagName('button') // list of each cluster (element)

    // get a list of all the clusters
    selectedClustersText = [] // list of each cluster (text)
    for (var i = 0; i < selectedClusters.length; i++) {
        selectedCluster = selectedClusters[i]
        selectedClustersText.push(selectedCluster.textContent)
    }

    // get the inputted keywords
    keywords = document.getElementById('list2')
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
    for (var i = 0; i < grantData.length; i++) {
        grant = grantData[i]

        // if the grants's name or url contains the inputted name/url, then it is included
        nameCorrect = (grant.grantName.trim().toLowerCase().includes(grantName) || grant.url.trim().toLowerCase().includes(grantName))
        //console.log(grant.grantName, grantName, nameCorrect)

        // if the dropdown is set to 'all', then its true. otherwise, the grant
        // should match that column
        userCorrect = (user == "all" || grant.userEmail == user)
        researcherCorrect = (researcher == "" || researcher == "all" || grant.researchers.includes(researcher))
        matchCorrect = (matched == "all" || grant.matched == matched) 

        //console.log(grant.userEmail, user, userCorrect)
        //console.log(grant.researchers, grant.researchers.includes(researcher), researcher,researcherCorrect)
        //console.log(grant.matched, matched, matchCorrect)

        // ensure the dates is within the set range
        deadlineSplit = grant.deadline.split("-")
        deadlineDate = new Date(deadlineSplit[2], deadlineSplit[1], deadlineSplit[0])
        deadlineCorrect = (deadlineDate >= deadlineLower && deadlineDate <= deadlineHigher)
        //console.log(grant.deadline, deadlineDate, deadlineCorrect)

        // ensure the duration is within the set range
        durationCorrect = (grant.duration >= durationLower && grant.duration <= durationHigher)
        //console.log(grant.duration, durationLower, durationHigher, durationCorrect)

        // if the cluster list is empty, then set this to true
        clusterCorrect = (selectedClustersText.length == 0)
        // loop through each of the grant's clusters
        for (x in grant.clusters) {
            cl = grant.clusters[x] // this isn't a string, but an id
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
        // loop through each of the grant's keywords
        for (x in grant.keywords) {
            kw = grant.keywords[x].toLowerCase()
            // loop through each of the inputted keywords
            for (y in keywordsText) {
                skw = keywordsText[y]
                // either the inputted one must include the grant's one
                // or the grant's one includes the inputted one
                if (skw.includes(kw) || kw.includes(skw)) {
                    // once such a pair found, it matches and no further searching is necessary
                    keywordCorrect = true
                    break
                }
            }
        }

        // only make the row visible if it matches for all of the user inputs
        if (nameCorrect && userCorrect && researcherCorrect && matchCorrect && deadlineCorrect && durationCorrect && clusterCorrect && keywordCorrect) {
            tableData[tableNumber].showRows.push(grant)
        }
    }

    // open error modal (modal 8) if no researchers are found
    if (tableData[tableNumber].showRows.length == 0) {
        openModal(8)
    }

    // reset the table
    renderTable(tableNumber)

    // close the modal
    var modal = document.getElementById("modal3");
    modal.style.display = "none";
}

// clear the grant form and reset the table
function resetGrantSearch(tableNumber) {
    // get the relevant data
    grantTable = tableData[tableNumber]
    grantData = grantTable.dataSet

    // reset the text inputs
    document.getElementById('grantName').value = ''

    // reset the dropdown inputs
    document.getElementById('grantUser').value = 'all'
    document.getElementById('matched').value = 'all'
    document.getElementById('grantResearcher').value = 'Any'

    // reset the date inputs
    document.getElementById('deadlineLower').value = ''
    document.getElementById('deadlineHigher').value = ''

    // reset the numeric inputs
    document.getElementById('durationLower').value = ''
    document.getElementById('durationHigher').value = ''

    // reset the visible row list
    tableData[tableNumber].showRows = grantData

    // reset the keyword selector
    document.getElementById('list2').innerHTML = ''

    // get the selected clusters
    selectedClusters = document.getElementById('selectedClusters2')
    selectedClusters = selectedClusters.getElementsByTagName('button') // list of each cluster (element)
    length = selectedClusters.length // note that the length will change (we are removing stuff), so we store it here

    // reset the cluster selector by looping through the selected list and unselecting each cluster
    for (var i = 0; i < length; i++) {
        selectedCluster = selectedClusters[0] // only get rid of the first one (remember the length of selectedClusters  is decreasing)
        id = selectedCluster.id
        unselectCluster(id)
    }

    // reset the table
    renderTable(tableNumber)

    // close the modal
    var modal = document.getElementById("modal3");
    modal.style.display = "none";
}

// filter through the user table
function searchUser(tableNumber) {
    // get the relevant data
    userTable = tableData[tableNumber]
    userData = userTable.dataSet

    // get the text inputs
    userName = document.getElementById('userName').value.trim().toLowerCase()
    email = document.getElementById('userEmail').value.trim().toLowerCase()

    // get the dropdown inputs
    role = document.getElementById('role').value

    // get the date inputs
    dateLower = document.getElementById('dateJoinedLower').value
    dateHigher = document.getElementById('dateJoinedHigher').value

    // get the numeric inputs
    xpLower = document.getElementById('xpLower').value
    xpHigher = document.getElementById('xpHigher').value

    grantsLower = document.getElementById('grantsLower').value
    grantsHigher = document.getElementById('grantsHigher').value

    // max and min dates in case one of the inputs isnt provided
    let maxDate = new Date(8640000000000000);
    let minDate = new Date(-8640000000000000);

    // deal with when one of the date inputs isn't provided
    if (dateLower == '') { dateLower = minDate }
    else { dateLower = new Date(dateLower) }

    if (dateHigher == '') { dateHigher = maxDate }
    else { dateHigher = new Date(dateHigher) }

    // deal with when xp isn't given
    if (xpLower == '') { xpLower = 0 }
    if (xpHigher == '') { xpHigher = Number.MAX_SAFE_INTEGER }

    // deal with when xp isn't given
    if (grantsLower == '') { grantsLower = 0 }
    if (grantsHigher == '') { grantsHigher = Number.MAX_SAFE_INTEGER }

    // reset the visible row list
    tableData[tableNumber].showRows = []

    // loop through each data row
    for (var i = 0; i < userData.length; i++) {
        user = userData[i]

        // check the text input matches
        nameCorrect = (user.name.trim().toLowerCase().includes(userName))
        emailCorrect = (user.email.trim().toLowerCase().includes(email))

        // if the dropdown is set to 'all', then its true. otherwise, the user
        // should match that column
        roleCorrect = (role == "all" || user.role == role)

        // ensure the dates is within the set range
        dateSplit = user.dateJoined.split("-")
        joinDate = new Date(dateSplit[2], parseInt(dateSplit[1]) - 1, dateSplit[0]) // convert to a date object for comparison
        dateCorrect = (joinDate >= dateLower && joinDate <= dateHigher)

        // ensure the numeric values are within the set range
        xpCorrect = (user.xp >= xpLower && user.xp <= xpHigher)
        grantsCorrect = (user.grantsMatched >= grantsLower && user.grantsMatched <= grantsHigher)

        // only make the row visible if it matches for all of the user inputs
        if (nameCorrect && emailCorrect && roleCorrect && dateCorrect && xpCorrect && grantsCorrect) {
            tableData[tableNumber].showRows.push(user)
        }
    }

    // open error modal (modal 8) if no researchers are found
    if (tableData[tableNumber].showRows.length == 0) {
        openModal(8)
    }

    // reset the table
    renderTable(tableNumber)

    // close the modal
    var modal = document.getElementById("modal5");
    modal.style.display = "none";
}

// clear the user form and reset the table
function resetUserSearch(tableNumber) {
    // get the relevant data
    userTable = tableData[tableNumber]
    userData = userTable.dataSet

    // reset the text inputs
    document.getElementById('userName').value = ''
    document.getElementById('userEmail').value = ''

    // reset the dropdown inputs
    document.getElementById('role').value = 'all'

    // reset the date inputs
    document.getElementById('dateJoinedLower').value = ''
    document.getElementById('dateJoinedHigher').value = ''

    // reset the numeric inputs
    document.getElementById('xpLower').value = ''
    document.getElementById('xpHigher').value = ''
    document.getElementById('grantsLower').value = ''
    document.getElementById('grantsHigher').value = ''

    // reset the visible row list
    tableData[tableNumber].showRows = userData

    // reset the table
    renderTable(tableNumber)

    // close the modal
    var modal = document.getElementById("modal5");
    modal.style.display = "none";
}

// filter through the clusters table
async function searchCluster(tableNumber) {
    // get the relevant data
    clusterTable = tableData[tableNumber]
    clusterTableData = clusterTable.dataSet

    // get the text inputs
    clusterName = document.getElementById('clusterName').value.trim().toLowerCase()
    matchTo = document.getElementById('matchTo').value.trim().toLowerCase()

    // get the numeric inputs
    researchersLower = document.getElementById('researchersLower').value
    researchersHigher = document.getElementById('researchersHigher').value

    // deal with when researchers number isn't given
    if (researchersLower == '') { researchersLower = 0 }
    if (researchersHigher == '') { researchersHigher = Number.MAX_SAFE_INTEGER }

    // reset the visible row list
    tableData[tableNumber].showRows = []

    // if matchTo isn't provided ...
    if (matchTo.trim() == '') {
        // loop through each data row
        for (var i = 0; i < clusterTableData.length; i++) {
            cluster = clusterTableData[i]

            // check the text input matches
            nameCorrect = (cluster.name.trim().toLowerCase().includes(clusterName))

            // ensure the numeric values are within the set range
            researchersCorrect = (cluster.numberResearchers >= researchersLower && cluster.numberResearchers <= researchersHigher)

            // only make the row visible if it matches for all of the user inputs
            if (nameCorrect && researchersCorrect) {
                tableData[tableNumber].showRows.push(cluster)
            }
        }

        // open error modal (modal 8) if no researchers are found
        if (tableData[tableNumber].showRows.length == 0) {
            openModal(8)
        }

        // reset the table
        renderTable(tableNumber)

        // close the modal
        var modal = document.getElementById("modal4");
        modal.style.display = "none";

        return
    }

    // otherwise, filter for relevant clusters first
    fetch('/clusterMatch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clusters: clusterTableData, matchTo: matchTo })
    }).then(response => response.json()).then(data => {
        clusterTableData = data.relevant

        // loop through each data row
        for (var i = 0; i < clusterTableData.length; i++) {
            cluster = clusterTableData[i]

            // check the text input matches
            nameCorrect = (cluster.name.trim().toLowerCase().includes(clusterName))

            // ensure the numeric values are within the set range
            researchersCorrect = (cluster.numberResearchers >= researchersLower && cluster.numberResearchers <= researchersHigher)

            // only make the row visible if it matches for all of the user inputs
            if (nameCorrect && researchersCorrect) {
                tableData[tableNumber].showRows.push(cluster)
            }
        }

        // open error modal (modal 8) if no researchers are found
        if (tableData[tableNumber].showRows.length == 0) {
            openModal(8)
        }

        // reset the table
        renderTable(tableNumber)

        // close the modal
        var modal = document.getElementById("modal4");
        modal.style.display = "none";
    })
}

// clear the cluster form and reset the table
function resetClusterSearch(tableNumber) {
    // get the relevant data
    clusterTable = tableData[tableNumber]
    clusterTableData = clusterTable.dataSet

    // reset the text inputs
    document.getElementById('clusterName').value = ''
    document.getElementById('matchTo').value = ''

    // reset the numeric inputs
    document.getElementById('researchersLower').value = ''
    document.getElementById('researchersHigher').value = ''

    // reset the visible row list
    tableData[tableNumber].showRows = clusterTableData

    // reset the table
    renderTable(tableNumber)

    // close the modal
    var modal = document.getElementById("modal4");
    modal.style.display = "none";
}

// filter through the changelog table
function searchChange(tableNumber) {
    // get the relevant data
    changeTable = tableData[tableNumber]
    changeData = changeTable.dataSet

    // get the dropdown inputs
    changeUser = document.getElementById('changeUser').value
    changeType = document.getElementById('changeType').value

    // get the date inputs
    dateLower = document.getElementById('dateLower').value
    dateHigher = document.getElementById('dateHigher').value

    // max and min dates in case one of the inputs isnt provided
    let maxDate = new Date(8640000000000000);
    let minDate = new Date(-8640000000000000);

    // deal with when one of the date inputs isn't provided
    if (dateLower == '') { dateLower = minDate }
    else { dateLower = new Date(dateLower) }

    if (dateHigher == '') { dateHigher = maxDate }
    else { dateHigher = new Date(dateHigher) }

    // reset the visible row list
    tableData[tableNumber].showRows = []

    // loop through each data row
    for (var i = 0; i < changeData.length; i++) {
        change = changeData[i]

        // if the dropdown is set to 'all', then its true. otherwise, the user
        // should match that column
        userCorrect = (changeUser == "all" || change.userEmail == changeUser)
        typeCorrect = (changeType == "all" || change.type == changeType)

        // ensure the dates is within the set range
        dateSplit = change.date.split("-")
        dateDate = new Date(dateSplit[2], parseInt(dateSplit[1]) - 1, dateSplit[0]) // convert to a date object for comparison
        dateCorrect = (dateDate >= dateLower && dateDate <= dateHigher)

        // only make the row visible if it matches for all of the user inputs
        if (userCorrect && typeCorrect && dateCorrect) {
            tableData[tableNumber].showRows.push(change)
        }
    }

    // open error modal (modal 8) if no researchers are found
    if (tableData[tableNumber].showRows.length == 0) {
        openModal(8)
    }

    // reset the table
    renderTable(tableNumber, dbclick="description", idField="changeID")

    // close the modal
    var modal = document.getElementById("modal6");
    modal.style.display = "none";
}

// clear the changelog form and reset the table
function resetChangeSearch(tableNumber) {
    // get the relevant data
    changeTable = tableData[tableNumber]
    changeData = changeTable.dataSet

    // reset the dropdown inputs
    document.getElementById('changeUser').value = 'all'
    document.getElementById('changeType').value = 'all'

    // reset the date inputs
    document.getElementById('dateLower').value = ''
    document.getElementById('dateHigher').value = ''

    // reset the visible row list
    tableData[tableNumber].showRows = changeData

    // reset the table
    renderTable(tableNumber)

    // close the modal
    var modal = document.getElementById("modal6");
    modal.style.display = "none";
}

// SERVER DATABASE CALLS
// lots of try-catch stuff since there might be features that are present in some places but not others
/*
DATA STRUCTURE JUSTIFICATION - List of Dictionaries:
Allows the program to loop through it and sort it easily. This
is also the format it would come in once I call the database, 
thus reducing the processing time.
*/

clustersData = [] // list of dictionaries
var clustersInitialised = false

// does many things at once - initialises the tables AND  initialises the cluster
// selectors. ALSO, it initialises the researcher dropdown in the search modal for
// grants. this improves efficiency
fetch('/db/researchers').then(response => response.json()).then(data => {
    for (var i = 0; i < data.length; i++) {
        row = data[i]

        // the name should be a link
        uniqueId = row.email.split("@")[0]
        row.uniqueId = uniqueId
        row.nameLink = `<a href='/researcher/${uniqueId.replace(".", "")}'>${row.name}</a>`

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

        // add to the table data
        tableData[7].dataSet.push(row)
        tableData[7].showRows.push(row)
        tableData[7].showFields = ['nameLink', 'school', 'keywords', 'activity', 'SELECT']

        // add to the grant search modal data list
        // if statement in case the grantResearcherOptions doesnt exist in that specific page
        researcherOptions = document.getElementById("grantResearcherOptions")
        if (researcherOptions != null) {
            researcherOptions.innerHTML += `
            <option data-value="${row.email}" value="${row.name}">
            `
        }
    }

    // try catch in case the table doesn't exist in that page
    try {
        tableData[1].totalPages = Math.ceil(data.length / rowsPerPage)
        renderTable(1)
    } catch {

    }

    // try catch in case the table doesn't exist in that page
    try {
        tableData[7].totalPages = Math.ceil(data.length / rowsPerPage)
        renderTable(7, dbclick=null, idField='uniqueId')
    } catch {

    }
    
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
                if (researcher.clusters.includes(row.clusterID)) {
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

        try {
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

            clustersInitialised = true;
        } catch {
            
        }

        try {
            // initialise cluster table
            tableData[3].totalPages = Math.ceil(clusterData.length / rowsPerPage)
            renderTable(3)
        } catch {

        }

        try {
            // if there are a bunch of cluster IDs (not names)
            clusterIds = document.getElementById("clusterText").textContent.split(", ")
            clusterNames = []
            for (x in clustersData) {
                if (clusterIds.includes(clustersData[x].id.toString())) {
                    clusterNames.push(clustersData[x].name)
                }
            }

            document.getElementById("clusterText").textContent = clusterNames.join(", ")
        } catch {

        }
    })
})

// initialises the table
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

    try {
        tableData[2].totalPages = Math.ceil(data.length / rowsPerPage)
        renderTable(2)
    } catch {

    }
})

// initialises tthe able and initialises the user dropdowns in the search modals
fetch('/db/users').then(response => response.json()).then(data => {
    for (var i = 0; i < data.length; i++) {
        row = data[i]

        // reformat date so its easier to sort
        row.dateReformatted = row.dateJoined.split('-').reverse().join('/')

        // add to the table data
        tableData[4].dataSet.push(row)
        tableData[4].showRows.push(row)
        tableData[4].showFields = ['name', 'email', 'role', 'xp']

        try {
            // add to the user dropdown
            // first in the grant search modal
            document.getElementById('grantUser').innerHTML += `
            <option value="${row.email}">${row.name}</option>
            `
        } catch {

        }

        try {
            // next in the change search modal
            document.getElementById('changeUser').innerHTML += `
            <option value="${row.email}">${row.name}</option>
            `
        } catch {
            
        }
    }

    try {
        tableData[4].totalPages = Math.ceil(data.length / rowsPerPage)
        renderTable(4)
    } catch {

    }

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
        
        try {
            tableData[5].totalPages = Math.ceil(dataChange.length / rowsPerPage)
            renderTable(5, dbclick="description", idField="changeID")
        } catch {

        }
    })
})