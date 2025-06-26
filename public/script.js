//TODO: Replace by call to server
clustersData = [
    {
        'name': 'Cluster A',
        'number': 14,
        'id': 1
    },
    {
        'name': 'Cluster B',
        'number': 54,
        'id': 2
    },
    {
        'name': 'Cluster C',
        'number': 2,
        'id': 3
    },
    {
        'name': 'Cluster D',
        'number': 32,
        'id': 4
    },
    {
        'name': 'Cluster E',
        'number': 5,
        'id': 5
    },
    {
        'name': 'Cluster F',
        'number': 17,
        'id': 6
    }
]

unselectedClustersDivs = document.getElementsByClassName('unselectedClusters')

for (var i = 0; i < unselectedClustersDivs.length; i++) {
    selectorNumber = unselectedClustersDivs[i].id.replace("unselectedClusters", "")
    clusterHTML = ''
    for (x in clustersData) {
        c = clustersData[x]
        clusterName = c.name
        clusterId = c['id']
        clusterHTML += `<button class='unselectedClusterButton' id='${selectorNumber}U${clusterId}' onclick="selectCluster('${selectorNumber}U${clusterId}')">${clusterName}</button>`
    }
    unselectedClustersDivs[i].innerHTML += clusterHTML;
}

function selectCluster(buttonId) {
    document.getElementById(buttonId).remove()

    buttonId = buttonId.split('U')
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

    clusterHTML = `<button class='selectedClusterButton' id='${selectorNumber}S${clusterId}' onclick="unselectCluster('${selectorNumber}S${clusterId}')">${clusterName}</button>`

    newSelectorId = 'selectedClusters' + selectorNumber
    newSelector = document.getElementById(newSelectorId)
    newSelector.innerHTML += clusterHTML
}

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

function getUnselectedClusterNames(selectorId) {
    selector = document.getElementById("unselectedClusters" + selectorId)
    clusters = selector.getElementsByClassName("unselectedClusterButton")
    clusterNames = []
    clusterIds = []

    for (var i = 0; i < clusters.length; i ++) {
        clusterNames.push(clusters[i].textContent)
        clusterIds.push(clusters[i].id)
    }

    return [clusterNames, clusterIds]
}

function findUnselectedCluster(selectorId) {
    clusters = getUnselectedClusterNames(selectorId)
    clusterNames = clusters[0]
    clusterIds = clusters[1]

    searchField = document.getElementById("searchUnselectedClusters" + selectorId).value.toLowerCase()
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

function resetUnselectedClusterSearch(selectorId) {
    document.getElementById("searchUnselectedClusters" + selectorId).value = ''
    findUnselectedCluster(selectorId)
}

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

function resetSelectedClusterSearch(selectorId) {
    document.getElementById("searchSelectedClusters" + selectorId).value = ''
    findSelectedCluster(selectorId)
}

function addKeyword(id) {
    ul = document.getElementById('list' + id)
    input = document.getElementById('keyword' + id)
    keyword = input.value
    numKeywords = ul.querySelectorAll('li').length
    if (numKeywords % 2 == 0) {
        keywordElement = `<li id='kw${id}-${numKeywords}' class='listboxliwhite'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${numKeywords})"></i> ${keyword}</li>`
    } else {
        keywordElement = `<li id='kw${id}-${numKeywords}' class='listboxligray'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${numKeywords})"></i> ${keyword}</li>`
    }
    
    ul.innerHTML += keywordElement
}

function deleteKeyword(id, kwid) {
    element = document.getElementById('kw' + id + '-' + kwid)
    element.remove()

    ul = document.getElementById('list' + id)
    numKeywords = ul.querySelectorAll('li').length
    for (let i = kwid+1; i <= numKeywords; i++) {
        element = document.getElementById('kw' + id + '-' + i)
        keyword = element.textContent
        element.remove()
        
        if ((i+1) % 2 == 0) {
            keywordElement = `<li id='kw${id}-${i-1}' class='listboxliwhite'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${i-1})"></i>${keyword}</li>`
        } else {
            keywordElement = `<li id='kw${id}-${i-1}' class='listboxligray'><i class="fa fa-trash" style="margin-right: 5px;" onclick="deleteKeyword(${id}, ${i-1})"></i>${keyword}</li>`
        }

        ul.innerHTML += keywordElement
    }
}

function openModal(id) {
    var modal = document.getElementById("modal" + id);
    var span = document.getElementById("close" + id);
    var cancel = document.getElementById("cancel" + id);

    modal.style.display = "block";

    span.onclick = function() {
        modal.style.display = "none";
    }

    if (cancel != null) {
        cancel.onclick = function() {
            modal.style.display = "none";
        }
    }
    

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function partition(arr, low, high, field) {
    let pivot = arr[high][field];
    let i = low - 1;

    for (let j = low; j <= high - 1; j++) {
        if (arr[j][field] < pivot) {
            i++;
            [arr[i], arr[j]] = [arr[j], arr[i]]; 
        }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]; 
    return i + 1;
}

function quickSort(arr, low, high, field) {
    if (low >= high) return;
    let pi = partition(arr, low, high, field);

    quickSort(arr, low, pi - 1, field);
    quickSort(arr, pi + 1, high, field);
}

function sortDictionaryList(dictionaryList, field) {
    arr = dictionaryList
    console.log(arr)
    quickSort(arr, 0, arr.length - 1, field);
    console.log(arr)
    return arr
}

unselectedClustersDivs = document.getElementsByClassName('unselectedClusters')
selectedClustersDivs = document.getElementsByClassName('selectedClusters')

for (var i = 0; i < unselectedClustersDivs.length; i++) {
    unselectedClustersDiv = unselectedClustersDivs[i]
    selectorNumber = unselectedClustersDiv.id.replace("unselectedClusters", "")

    document.getElementById("sortUnselected" + selectorNumber).addEventListener('change', function(event) {
        const selectedValue = event.target.value

        clusters = getUnselectedClusterNames(selectorNumber)

        clusterIds = clusters[1]
        for (x in clusterIds) {
            clusterIds[x] = parseInt(clusterIds[x].split('U')[1])
        }

        unselectedClusterData = []

        for (x in clustersData) {
            if (clusterIds.includes(clustersData[x]["id"])) {
                unselectedClusterData.push(clustersData[x])
            }
        }

        unselectedClusterData = sortDictionaryList(unselectedClusterData, selectedValue)

        unselectedClustersDiv = document.getElementById('unselectedClusters' + selectorNumber)
        unselectedClustersDiv.innerHTML = '';

        clusterHTML = ''
        for (x in unselectedClusterData) {
            c = unselectedClusterData[x]
            clusterName = c.name
            clusterId = c['id']
            clusterHTML += `<button class='unselectedClusterButton' id='${selectorNumber}U${clusterId}' onclick="selectCluster('${selectorNumber}U${clusterId}')">${clusterName}</button>`
        }

        unselectedClustersDiv.innerHTML += clusterHTML;
    });
}

for (var i = 0; i < selectedClustersDivs.length; i++) {
    selectedClustersDiv = selectedClustersDivs[i]
    selectorNumber = selectedClustersDiv.id.replace("selectedClusters", "")

    document.getElementById("sortSelected" + selectorNumber).addEventListener('change', function(event) {
        const selectedValue = event.target.value

        clusters = getSelectedClusterNames(selectorNumber)

        clusterIds = clusters[1]
        for (x in clusterIds) {
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
    });
}

const dataSet1 = Array.from({ length: 53 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
const dataSet2 = Array.from({ length: 32 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
const rowsPerPage = 10;

tableData = {
    1 : {
        "dataSet": dataSet1,
        "currentPage": 1,
        "totalPages": Math.ceil(dataSet1.length / rowsPerPage)
    },
    2 : {
        "dataSet": dataSet2,
        "currentPage": 1,
        "totalPages": Math.ceil(dataSet2.length / rowsPerPage)
    },
}

function renderTable(tableNumber) {
    tableBody = document.getElementById('tableBody' + tableNumber);
    firstBtn = document.getElementById('firstNav' + tableNumber);
    prevBtn = document.getElementById('prevNav' + tableNumber);
    nextBtn = document.getElementById('nextNav' + tableNumber);
    lastBtn = document.getElementById('lastNav' + tableNumber);

    tableBody.innerHTML = '';
    const start = (tableData[tableNumber]["currentPage"] - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageItems = tableData[tableNumber]["dataSet"].slice(start, end);

    pageItems.forEach(item => {
        const row = `<tr><td>${item.id}</td><td>${item.name}</td></tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });

    updateButtons(tableNumber);
}

function updateButtons(tableNumber) {
    firstBtn = document.getElementById('firstNav' + tableNumber);
    prevBtn = document.getElementById('prevNav' + tableNumber);
    nextBtn = document.getElementById('nextNav' + tableNumber);
    lastBtn = document.getElementById('lastNav' + tableNumber);
    currentPage = tableData[tableNumber]["currentPage"]
    totalPages = tableData[tableNumber]["totalPages"]

    firstBtn.disabled = currentPage === 1;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    lastBtn.disabled = currentPage === totalPages;
}

function goToFirst(tableNumber) {
    tableData[tableNumber]["currentPage"] = 1;
    renderTable(tableNumber);
}

function goToPrev(tableNumber) {
    tableData[tableNumber]["currentPage"]--;
    renderTable(tableNumber);
}

function goToNext(tableNumber) {
    tableData[tableNumber]["currentPage"]++;
    renderTable(tableNumber);
}

function goToLast(tableNumber) {
    tableData[tableNumber]["currentPage"] = tableData[tableNumber]["totalPages"];
    renderTable(tableNumber);
}

renderTable(1);
renderTable(2);

window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
    document.getElementById("navbarNav").classList.add("hidden");
    document.getElementById("navbarNav").style.setProperty("visibility", "hidden", "important");
    document.getElementById("navbarNav").style.opacity = '0';
    
    document.getElementById("navbar-brand").classList.add("smallBrand");
    document.getElementById("navbar-brand").classList.remove("bigBrang");
  } else {
    document.getElementById("navbarNav").classList.remove("hidden");
    document.getElementById("navbarNav").style.visibility = 'visible';
    document.getElementById("navbarNav").style.opacity = '1';
    
    document.getElementById("navbar-brand").classList.add("bigBrand");
    document.getElementById("navbar-brand").classList.remove("smallBrand");
  }
}