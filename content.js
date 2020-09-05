/**
 * Create the configuration data structure needed to 
 * instantiate a new Chart/Graph
 * @param {object} details External atributes for configuring the graph 
 * @param {Array} daysList List of the day names to be shown 
 * @param {Array} referenceData The data that will be plotted  
 * @param {Array} currentData The executed hours data
 */
function createConfig(details, daysList, referenceData, currentData) {
    return {
        type: 'line',
        data: {
            labels: daysList,
            datasets: [{
                label: details.steppedLine,
                steppedLine: details.steppedLine,
                data: currentData,
                borderColor: 'red',
                fill: false,
                lineTension:0,
                spanGaps: true
            },
            {
                label: details.steppedLine,
                steppedLine: details.steppedLine,
                data: referenceData, //data: [85, 85*(6/7), 85*(5/7), 85*(4/7), 85*(3/7), 85*(2/7), 85*(1/7), 0],
                borderColor: 'green',
                fill: false,
                lineTension:0,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            scales:{
                xAxes:[
                    {
                        ticks: {
                            fontSize: 9
                        }
                    }
                ]
            },
            legend: {
                display:false
            },
            title: {
                display: false,
                text: details.label,
            }
        }
    };
}

/**
 * Call the chart rendering method 
 * @param {Array} daysList List of the day names to be shown 
 * @param {Array} referenceData The data that will be plotted  
 * @param {Array} currentData The executed hours data
 */
function renderGraph(daysList, referenceData, currentData) {
    var container = document.querySelector('#chartContainer');
    
    var steppedLineSettings = {
        steppedLine: false,
        label: 'No Step Interpolation'
    };
    
    var div = document.createElement('div');
    div.classList.add('chart-container');
    var canvas = document.createElement('canvas');
    div.appendChild(canvas);
    container.appendChild(div);
    var ctx = canvas.getContext('2d');
    var config = createConfig(steppedLineSettings, daysList, referenceData, currentData);
    new Chart(ctx, config);
    
}

/**
 * Get Sub-Tasks details to calculate the totals for the story
 * @param {string} workLogURL Base URL for getting sub-tasks details
 * @param {Array} itemsList List of tasks
 * @param {int} currentIndex The index of the current extracted task in the total list
 * @param {Array} workLogs Current worklogs list
 * @param {callback} cb Callback
 */
function getSubWorkingHours(workLogURL, itemsList, currentIndex, workLogs, cb){
    if (itemsList && itemsList[currentIndex]){
        $.ajax({
            url: workLogURL.replace("{0}", itemsList[currentIndex]).replace("{1}", itemsList[currentIndex]),
            headers: {
                "X-PJAX": true
            }
        }).done(function( data ) {

            //console.log(data);
            // Create workStart and timeSpent
            var tempLogs = [];
            if (data.projects && data.projects.length>0 && data.projects[0].issues && data.projects[0].issues.length>0){
                tempLogs = data.projects[0].issues[0].workLogs;    
                workLogs = workLogs.concat(tempLogs);            
            }    
            else{ // Internal JIRA HTML version
                var r = /'Created: (\d+\/\w+\/\d+) \d+:\d+ .M'/gm;
                var result;
                var firstDate = r.exec(data);


                var time;
                r = /worklog-duration.+>(.*?)</gm;

                while((result = r.exec(data)) !== null) {
                    time = extractJiraTimeFromText(result[1]);
                    
                    workLogs.push({ workStart: GetDate(firstDate[1]), timeSpent: time});
                }

            }

            if (currentIndex<itemsList.length-1){
                getSubWorkingHours(workLogURL, itemsList, currentIndex+1, workLogs, cb);
            }
            else{
                // get data
                cb(workLogs);
            }
        });
    }
    else{
        cb(workLogs);
    }
}

/** 
 * Create the HTML structure for displaying the Burn Down graph on a JIRA Ticket page
 */
function insertBurnDownDOM(){
    console.log("starting dom changes");
    const baseDomain = $('meta[name=ajs-jira-base-url]').attr("content");
    
    if (baseDomain){
        $('chartContainer').remove();
        var chartParentContainer = $("<div id='chartParentContainer'></div>");
        chartParentContainer.addClass("module").addClass("toggle-wrap");
        var titleTag = $(".toggle-title").not("a").prop("tagName");

        // Default behavior with H4 tag
        var chartToggle = $("<div id='chartmodule_heading' class='mod-header'><ul class='ops'></ul><a href='#' class='aui-button toggle-title'><svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><g fill='none' fill-rule='evenodd'><path d='M3.29175 4.793c-.389.392-.389 1.027 0 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955c.388-.392.388-1.027 0-1.419-.389-.392-1.018-.392-1.406 0l-2.298 2.317-2.307-2.327c-.194-.195-.449-.293-.703-.293-.255 0-.51.098-.703.293z' fill='#344563'></path></g></svg></a><h4 class='toggle-title'>Burndown</h4></div>");

        if (titleTag == "H2"){
            chartToggle = $("<div id='chartmodule_heading' class='mod-header'><ul class='ops'></ul><h2 class='toggle-title'>Burndown</h2></div>");
        }
        var chartContent = $("<div class='mod-content'></div>");
        chartContent.prepend("<div id='chartContainer'>&nbsp;</div>");
        chartParentContainer.prepend(chartContent);
        chartParentContainer.prepend(chartToggle);

        $('#viewissuesidebar').prepend(chartParentContainer);

        var workLogURL = baseDomain + $("li[data-label='Work Log']").attr("data-href");
        
        var isDenizWorklog = false;
        var issueID = $("#key-val.issue-link").attr("rel");
        var ticket = $('meta[name=ajs-issue-key]').attr("content");

        if (workLogURL.includes("com.deniz")){
            isDenizWorklog = true;
            workLogURL = baseDomain + "/rest/com.deniz.jira.worklog/1.0/timesheet/issueId?targetKey={0}&_=1571075815473";
        }
        else{
            var r = /(http.*?browse\/)(.*?)(\?.*)/ig;
            workLogURL = workLogURL.replace(r, "$1{1}$3");
            
        }

        var dueDate = $("#due-date time").attr("datetime");
        
        var issueURL = baseDomain + "/secure/QuickEditIssue!default.jspa?issueId="+issueID+"&decorator=none";


        if (dueDate){
            $.ajax({
                url: issueURL
            }).done(function( ticketData ) {

                var ticketDueDate;
                var ticketOriginalEstimate;
                var todayDate;

                for (var i=0;i<ticketData.fields.length;i++){
                    var currentField = ticketData.fields[i];

                    if (currentField.id == "duedate"){

                        var r = /id=.duedate.*?value=.(\d+\/.{1,3}\/.{2,4}).>/gm;
                        var m = r.exec(currentField.editHtml);
                        if (m)
                        {
                            ticketDueDate = m[1];
                        }
                    }
                    else if (currentField.id == "timetracking"){

                        var r = /id=.timetracking_originalestimate.*?value=.([\d\w\s]*?).\/>/gm;
                        var m = r.exec(currentField.editHtml);
                        if (m)
                        {
                            ticketOriginalEstimate = m[1];
                        }
                    }
                }

                $.ajax({
                    url: workLogURL.replace("{0}", issueID).replace("{1}", ticket),
                    headers: {
                        "X-PJAX": true
                    }
                }).done(function( data ) {

                    //console.log(data);
                    
                    var totalDaysRange = data.daysBetween;
                    var firstLogDay;
                    var lastLogDay;
                    var workLogs = [];
                    var workLogFinalList = {};
                    var originalEstimate = ticketOriginalEstimate; 
                    var numericTotalTime = 0;
                    var dataReferenceLine = [];
                    var dataRealBurnLine = [];
                    var daysList = [];

                    if (!originalEstimate)
                    {
                        // Getting from the visible box on Time Tracking group (XXd XXh XXm)
                        originalEstimate = extractJiraTimeFromText($("#timetrackingmodule .tt_inner dl:first dd:last").text().trim())/60;
                    }                
                                    
                    // Getting remaining from the visible box on Time Tracking group (XXd XXh XXm)
                    var remainingTime = extractJiraTimeFromText($("#timetrackingmodule .tt_inner dl:nth(1) dd:last").text().trim())/60;

                    // Getting logged from the visible box on Time Tracking group (XXd XXh XXm)
                    var loggedTime = extractJiraTimeFromText($("#timetrackingmodule .tt_inner dl:last dd:last").text().trim())/60;

                    numericTotalTime = loggedTime + remainingTime;

                    // Deniz plugin returns json data
                    if (data.projects && data.projects.length>0 && data.projects[0].issues && data.projects[0].issues.length>0){
                        workLogs = data.projects[0].issues[0].workLogs;                
                    }     
                    // Default plugin returns html data
                    else{
                        var r = /<span\sclass=date>(.*?)<(?:.*?\n)*?.*?duration.>(.*?)</gm;
                        var m=r.exec(data);

                        while (m){
                            var dateTemp = new Date(m[1]);
                            var workLogTemp ={};
                            workLogTemp.workStart = dateTemp.getTime();
                            workLogTemp.timeSpent = extractJiraTimeFromText(m[2]);
                            workLogs.push(workLogTemp);
                            m=r.exec(data);
                        }
                    }       

                    // Get children items work logs
                    var subIds = [];
                    // Get sub-tasks ids
                    $(".subtask-table-container .issuerow").each(function(i,e){
                        if (isDenizWorklog){
                            subIds.push($(e).attr("rel"));
                        }
                        else{
                            subIds.push($(e).attr("data-issuekey"));
                        }
                        
                    });
                    
                    getSubWorkingHours(workLogURL, subIds, 0, workLogs, function (finalWorkLogs){
                        console.log(workLogs);
                        
                        // do we have any work logged?
                        if (finalWorkLogs && finalWorkLogs.length>0){
                            
                            // Sort after merging all tickets
                            finalWorkLogs.sort(function(a,b){
                                if (a.workStart<b.workStart){
                                    return -1;
                                }
                                else if (a.workStart>b.workStart){
                                    return 1;
                                }
                                else{
                                    return 0;
                                }
                            });
                            
                            if (finalWorkLogs[0].isInLocalDate){
                                firstLogDay = cloneDate(finalWorkLogs[0].workStart);
                            }
                            else{
                                // first day that we have time tracked
                                firstLogDay = cloneDate(dateFromEpochMs(finalWorkLogs[0].workStart));
                            }
                            // last day that we have time tracked
                            lastLogDay = cloneDate(firstLogDay);
                            var currentRemaining = numericTotalTime;

                            for(var i=0;i<finalWorkLogs.length;i++){
                                var currentItem = finalWorkLogs[i];
                                var currentDate = dateFromEpochMs(currentItem.workStart);
                                if (firstLogDay>currentDate){
                                    firstLogDay = cloneDate(currentDate);
                                }
                                else if (lastLogDay<currentDate){
                                    lastLogDay = cloneDate(currentDate);
                                }

                                var currentKey = currentDate.toISOString().split('T')[0]; // yyyy-mm-dd
                                
                                if (!workLogFinalList[currentKey]){
                                    workLogFinalList[currentKey] = { items: [], dailyBurnedMinutes: 0 };
                                }

                                var burnedOnTask = parseFloat(currentItem.timeSpent)/60;
                                workLogFinalList[currentKey].dailyBurnedMinutes += burnedOnTask; 
                                currentRemaining = currentRemaining - burnedOnTask;
                                workLogFinalList[currentKey].items.push(currentItem.timeSpent);

                                workLogFinalList[currentKey].dailyRemaining = currentRemaining;

                            }

                            ticketDueDate = new Date(ticketDueDate);
                            var lastDay = (lastLogDay>ticketDueDate?cloneDate(lastLogDay):cloneDate(ticketDueDate));

                            
                            
                            // Filling the array with all dates between the first and the last day
                            for (var d = cloneDate(firstLogDay); d <= lastDay && daysList.length<50; d.setDate(d.getDate() + 1)) {
                                // Getting only weekdays
                                if (d.getDay()<6 && d.getDay()>0){
                                    var formatedDate = d.toISOString().split('T')[0];
                                    //console.log(formatedDate);
                                    if (!workLogFinalList[formatedDate]){
                                        dataRealBurnLine = dataRealBurnLine.concat([,]);
                                    }
                                    else{
                                        dataRealBurnLine.push(workLogFinalList[formatedDate].dailyRemaining);
                                    }

                                    if (d.getTime()==firstLogDay.getTime()){
                                        dataReferenceLine.push(numericTotalTime);
                                    }
                                    else if (d.getTime()==lastDay.getTime()){
                                        dataReferenceLine.push(0);
                                    }
                                    else{
                                        // Add an empty spot
                                        dataReferenceLine = dataReferenceLine.concat([,]);
                                    }

                                    const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
                                    const month1 = formatter.format(d);
                                    const dayOfDate = d.getDate();

                                    daysList.push(month1+", "+dayOfDate);
                                }
                            }

                            renderGraph(daysList, dataReferenceLine, dataRealBurnLine);
                        }
                        else{
                            $("#chartParentContainer").addClass("collapsed");
                            $('#chartContainer').text("No worklog available");
                        }
                    });
                    
                });
            });

        }
        else{        
            $("#chartParentContainer").addClass("collapsed");
            $('#chartContainer').text("It's not possible to render a burndown without a due date");
        }
    }
}

function optimizeUI(){    

    // $('.ghx-extra-field-content').each(function (item){$(item).text(function(i, text) {if (text.startsWith("None")){return text;} else {return "T:"+Text;}})});

    $('.ghx-parent-key').text(function(i, text) {
        //return ("000" + text.replace(/QUAL-(\d{2,5})/gi, '$1')).substr(-4);
    });

    $('.ghx-description').text(function(i, text) {
        return text.replace(/\d+ sub-tasks?/gi, '');
    });

    //$('.ghx-heading').css('margin-top', '2px');
    //$('.ghx-heading').css('margin-bottom', '2px');

    $('.jira-issue-status-lozenge').text(function(i, text) {
        return text.replace(/DEVELOPED/gi, 'TO BE TESTED');
    });

    $('.jira-issue-status-lozenge').text(function(i, text) {
        return text.replace(/In qa/gi, 'In Testing');
    });
    
    $('.jira-issue-status-lozenge').text(function(i, text) {
        return text.replace(/ready for development/gi, 'Ready to code');
    });

    

    updateTicket($('.ghx-swimlane-header:not(".updatedTicked"):first'), 1);
}

function updateTicket(ticketElement, index){
    var issue = $(ticketElement).attr('data-issue-id');

    if (issue && !$(ticketElement).hasClass("updatedTicket")){
        $(ticketElement).addClass('updatedTicket');

        $.ajax({
            url: 'https://jiracloud.cit.com.br/rest/api/2/issue/'+issue,
            headers: {
                "X-PJAX": true
            }
        }).done(function( data ) {

            var labels = data.fields.labels;
            var detailText = '';
            
            $('div[data-issue-id='+data.id+'] span.ghx-summary').text(function(i, text) {
                if (text.length > 90){
                    return text.substr(7, 80) + '...';
                }
                else{
                    return text.substr(7);
                }
            });
                
            $('div[data-issue-id='+data.id+'] .jira-issue-status-lozenge').text(function(i, text) {
                if (data.fields.issuetype.name == "Incident" || data.fields.issuetype.name == "Bug"){
                    detailText = "To investigate";
                }
                else if (labels.includes("described")){
                    detailText = "To detail";
                }
                else{
                    detailText = 'To describe';
                }
        
                return text.replace(/Product backlog/gi, detailText);
            });
        
            if (data.fields.assignee && data.fields.assignee.avatarUrls && $(ticketElement).children('div .updatedItem').length == 0){
                $(ticketElement).children('div').append('<span class="updatedItem">&nbsp;<img height=16 width=16 src="'+data.fields.assignee.avatarUrls['16x16']+'"></span>');
            }
            if (data.fields.aggregatetimeestimate && data.fields.aggregatetimeestimate>0){
                var estimateColor = "orange";

                if (data.fields.subtasks.length > 2){
                    estimateColor = "green";
                }
                else if (data.fields.subtasks && data.fields.subtasks.length === 2){
                    estimateColor = "gray";
                }
                $(ticketElement).children('div').append('&nbsp;<img width=16 alt="" src="'+ imgsSourcePlus.ttIcon+'"/><span style="color: ' + estimateColor + '">&nbsp;~' + (data.fields.aggregatetimeestimate/60/60 ).toFixed(1) + 'h</span>');
            }
            else{
                // Story estimate based on the sub-imp tasks estimates
                //sumSubTasksEstimates(data.fields.subtasks, 0, 0);                
            }

            // Status <> backlog
            if (data.fields.status.id != 10354){                

                // Status ready, in dev or in test, in qa
                if (data.fields.status.id == 10012 || data.fields.status.id == 10013 || data.fields.status.id == 11656 || data.fields.status.id == 10027){
                    var hasTest = false;
                    for (var i=0;i<data.fields.subtasks.length;i++){
                        if (data.fields.subtasks[i].fields.issuetype.id == 33 ){
                            hasTest = true;
                            break;
                        }
                    }

                    if (!hasTest && !(data.fields.issuetype.name == "Incident" || data.fields.issuetype.name == "Bug")){
                        $(ticketElement).children('div').append('<span style="color: red">&nbsp;Missing test activites</span>');
                    }

                    if (!data.fields.aggregatetimeestimate || data.fields.aggregatetimeestimate == 0){
                        
                        $(ticketElement).children('div').append('<span style="color: red">&nbsp;<img width="16" src="'+imgsSourcePlus.ttIcon+'"/>Missing remaining</span>');
                    }
                }
                // spliting the execution thread to avoid screen freezing
                //setTimeout(function(){checkTestingActivities(data.fields)},10);
            }

            if (data.fields.duedate){
                
                $(ticketElement).children('div').append('&nbsp;<img width=16 alt="" src="'+imgsSourcePlus.calendarIcon+'"/><span style="color: gray">&nbsp;~' + (data.fields.duedate ) + '</span>');
            }
            
            // async flow
            checkNextItem(index);
        });
    }
    else{
        // sync flow
        checkNextItem(index);
    }
}

function checkNextItem(index){
    var elements = $('.ghx-swimlane-header:not(".updatedTicket")');
    if (elements.length > index + 1){
        // recursive call for each list item
        setTimeout(function(){updateTicket(elements[index], index + 1);}, 10);
    }
    else if (index<=1){
        // try to start again after 30 seconds if the list wasn't ready
        setTimeout(optimizeUI, 2000);
    }
    else{
        statusPlus = 2;
        console.log('Finished checking list');
    }
}

// DEPRECATED
function sumSubTasksEstimates(subtasksList, currentIndex, storyEstimate){
    var currentItem = subtasksList[currentIndex].fields;
    if (currentItem.issuetype.name == "Sub-Imp"){
        $.ajax({
            url: 'https://jiracloud.cit.com.br/rest/api/2/issue/'+currentItem.id,
            headers: {
                "X-PJAX": true
            }
        }).done(function( subDetails ) {
            // TODO: Get subtask estimes


            if (currentIndex + 1 < subtasksList.length){
                sumSubTasksEstimates(subtasksList, currentIndex + 1, storyEstimate);
            }
            else{
                if (storyEstimate>0){
                    // ttIcon:
                    $(ticketElement).children('div').append('&nbsp;<img width=16 alt="" src="'+ttIcon+'"/><span style="color: orange">&nbsp;~' + (data.fields.aggregatetimeestimate/60/60 ).toFixed(1) + 'h</span>');
                }
                // else: we didn't find any estimated sub-imp 
            }
        });
    }  
    
}

function monitorNetwork(){
    chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
        if(message.event == 'updates' && statusPlus == 2)
        {
            console.log('handling event');
            statusPlus = 1;
            optimizeUI();
        }
        else{
            console.log('ignoring event');            
        }
    });
}

$(document).ready(function(){
    statusPlus = 1;
    insertBurnDownDOM();
    setTimeout(optimizeUI, 1000);
    setTimeout(monitorNetwork, 3300);
});

var statusPlus = 0; // 0 Not started | 1 in progress | 2 finished
var imgsSourcePlus = {

    ttIcon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAgAElEQVR4XuydC5QlVXX3/7tu3x6Y6UEQeUg+BhWNKKCCKIKoID4wiQpqa76R7q5TPV5AmfgI8TPx0bavGN9mEORK16nuwYmxfWBMoqICCYIhIj54qgFlSFBABJmegenbt/a3aqYhCDPT91H31qmqf601C9aac/b+798+c/vft6rOEfAiARIgARIgARIoHQEpXcUsmARIgARIgARIADQAXAQkQAIkQAIkUEICNAAlbDpLJgESIAESIAEaAK4BEiABEiABEighARqAEjadJZMACZAACZAADQDXAAmQAAmQAAmUkAANQAmbzpJJgARIgARIgAaAa4AESIAESIAESkiABqCETWfJJEACJEACJEADwDVAAiRAAiRAAiUkQANQwqazZBIgARIgARKgAeAaIAESIAESIIESEqABKGHTWTIJkAAJkAAJ0ABwDZAACZAACZBACQnQAJSw6SyZBEiABEiABGgAuAZIgARIgARIoIQEaABK2HSWTAIkQAIkQAI0AFwDJEACJEACJFBCAjQAJWw6SyYBEiABEiABGgCuARIgARIgARIoIQEagBI2nSWTAAmQAAmQAA0A1wAJkAAJkAAJlJAADUAJm86SSYAESIAESIAGgGuABEiABEiABEpIgAaghE1nySRAAiRAAiRAA8A1QAIkQAIkQAIlJEADUMKms2QSIAESIAESoAHgGiABEiABEiCBEhKgAShh01kyCZAACZAACdAAcA2QAAmQAAmQQAkJ0ACUsOksmQRIgARIgARoALgGSIAESIAESKCEBGgASth0lkwCJEACJEACNABcAyRAAiRAAiRQQgI0ACVsOksmARIgARIgARoArgESIAESIAESKCEBGoASNp0lkwAJkAAJkAANANcACZAACZAACZSQAA1ACZvOkkmABEiABEiABoBrgARIgARIgARKSIAGoIRNZ8kkQAIkQAIkQAPANUACJEACJEACJSRAA1DCprNkEiABEiABEqAB4BogARIgARIggRISoAEoYdNZMgmQAAmQAAnQAHANkAAJkAAJkEAJCdAAlLDpLJkESIAESIAEaAC4BkiABEiABEighARoAErYdJZMAiRAAiRAAjQAXAMkQAIkQAIkUEICNAAlbDpLJgESIAESIAEaAK4BEiABEiABEighARqAEjadJZMACZAACZAADQDXAAmQAAmQAAmUkAANQAmbzpJJgARIgARIgAaAa4AESIAESIAESkiABqCETWfJJEACJEACJEADwDVAAiRAAiRAAiUkQANQwqazZBIgARIgARKgAeAaIAESIAESIIESEqABKGHTWTIJkAAJkAAJ0ABwDZAACZAACZBACQnQAJSw6SyZBEiABEiABGgAuAZIgARIgARIoIQEaABK2HSWTAIkQAIkQAI0AFwDJEACJEACJFBCAjQAJWw6SyYBEiABEiABGgCuARIgARIgARIoIQEagBI2nSWTAAmQAAmQAA0A1wAJkAAJkAAJlJAADUAJm86SSYAESIAESIAGgGuABEiABEiABEpIgAaghE1nySRAAiRAAiRAA8A1QAIkQAIkQAIlJEADUMKms2QSIAESIAESoAHgGiABEiABEiCBEhKgAShh01kyCZAACZAACdAAcA2QAAmQAAmQQAkJ0ACUsOksmQRIgARIgARoALgGSCBnBIaHh3dfvnz5AZVK5bELwD4V1X1VZF/E8aNF5NEqsgdU9wDwKAArFv8sA7DtjwIDAnjY/ie5YgViARYAbH3In80Akj+/h8i9onqvqv4Onvc7Ub2jKXLHAHBns9n89ZYtW26bnZ29L2coKZcESk2ABqDU7WfxLhLwfX83VT1YRJ4kIo9P/h8iqyByEFRXAdjTRd0A7oHIRqjeAtWNInKTqv5SVX+R/H8URfc7qpuySKCUBGgAStl2Fu0CgVqtVp2fnz8UwOEicpiqHgqRQwA8DkDFBY0pamgC+BVUbxSR61T1WgDXDA4OXlev1xsp5mEoEiCBFgnQALQIisNIoBsCw8PDg7vvscczvGbzKBU5SoAjATwVQLWbuAWYm/zwv16Bq0X1qrhSueq+e+/98ezs7HwBamMJJOA0ARoAp9tDcXklMDIysm+lUjkOnvdcqB4L4IjFe/B5LamfupPnEH4EkSsQx5c3m83vrV+//o5+CmAuEigDARqAMnSZNfacwPj4+KPjOH6hqh4vIi9UIPkqn/++0iGvAtyoqheLyKWe5108NTX1u3RCMwoJlJcAP6DK23tW3gWB4eHhysqVK49pqr4UwEmLX+k/8FR9F5E5tQUCyVsLVwP4ZkXkW5s2bfr+7Oxs8owBLxIggTYI0AC0AYtDy03A9/3k6fuTIPJyiLwMqnuVm4gj1YvcDdVvQPXriSmIougeR5RRBgk4TYAGwOn2UFzWBIwx+8TAKaL6aoicwIf2su7IkvkbUL1ERb7sAV+11t655AwOIIGSEqABKGnjWfbOCST385vN5qtV5LUCJD/0i/ZKXlna31TgElH9YqVS+TKfGyhL21lnqwRoAFolxXGFJrB27dplc3NzL1fgVAB/wt/0C9fu5HXDfxXggqGhoa+vW7cuedOAFwmUmgANQKnbz+KNMUeqagCR1zu8wx4blS6Be6D6eREJrbXJw4S8SKCUBGgAStn2chcdBMFKVV0N4DTd/n4+r5ISkGS/AeA8EdkQhuGmkmJg2SUlQANQ0saXsezx8fHDmqpnqOqoAENlZMCad0xAgTkRmamInDs1NZVsU8yLBApPgAag8C0ud4ETExPeLbfc8goR+Qvd/kAfLxLYJQEBLlHVvz/ooIP+aXJyMiYuEigqARqAona25HWNjIysGBgYMAq8BcDBJcfB8jsjcJMAn1pYWLDr169PjkXmRQKFIkADUKh2spjR0dG9vYGBtVA9E8DeJEICKRC4CyJnxwsL62ZmZu5KIR5DkIATBGgAnGgDRXRLYM2aNfs1ms2zBDgDwIpu43E+CeyAwGYFzq1WKh87//zzbychEsg7ARqAvHew5PpPrdUeW2003qHAGwDsXnIcLL8/BO4T4HONavXDF9Trv+5PSmYhgfQJ0ACkz5QR+0Ag2aJXRd4B1TcC2K0PKZmCBB5O4H6InCOqH+aWw1wceSRAA5DHrpVY8+I7/GfFwNv4Kl+JF4JDpSevEHrAJ0TkY9xLwKHGUMqSBGgAlkTEAS4QqNVq1UajkWzc8x4A+7igiRpI4GEE7hTgfdVq9bx6vZ5sPcyLBJwmQAPgdHsoLiFgjHmlAh8F8CQSIYEcEPiFAH9lrf1aDrRSYokJ0ACUuPmulz46Ovo0r1L5NIDjXddKfSSwAwKXxs3mm2dmZn5KOiTgIgEaABe7UnJNvu/vCc973+IDfjyKt+TrIeflN5MHBRHH74mi6J6c10L5BSNAA1Cwhua8HPGDYAyqH+F9/px3kvIfTuBOiLw9CsNpAEo8JOACARoAF7pADfB9/xCI1AE8jzhIoMAELoNqLYqiGwtcI0vLCQEagJw0qqgyh4eHB4eGht6pwDsADBa1TtZFAg8hMC/Ah+fm5j44Ozs7TzIkkBUBGoCsyDMvRoPgmIrqlAJPIQ4SKBsBAW5oiozPhOH3y1Y763WDAA2AG30olQrf93cTkQ8o8FYAXqmKZ7Ek8IcEYgE+qarviqLofsIhgX4SoAHoJ23mSu71PwsiMwAOIQ4SIIEHCdwI1dEoin5AJiTQLwI0AP0iXfI8ExMTAxs3bny3Au8EwFf7Sr4eWP4OCTQF+OCqVavePzk5uUBGJNBrAjQAvSbM+BgbGztYPO/zAI4mjlQJJO+V/w+A27b9Ub1DRO4AcJeq3i0idwPYpKqb4jjeUq1W76tUKsnXzI16vZ78gHngdTSp1WoDAKrNZnO3RqOxu+d5y0VkJYCVqrqXiOwFYG9V3Rci+wI4YPHPHwHYM9WqGOxKjePXT09P30QUJNBLAjQAvaTL2Mk2vmMKrEt+kBBHRwSSc+dvAPAzAX4G4GZVvXn58uW/POecc+Y6ipjypDe+8Y1DW7ZsebyIPAHAExR4Mrb/SR7u3C/ldGUJt0mAtdbaZN8AXiTQEwI0AD3ByqAjIyMrBgYGzlFglDRaItAEcD1UfwjgxwB+EsfxNTMzM3e1NNvRQaOjo3t7nnc4gKcDeAZEngngqbwN1FrDBJhZWFh44/r16ze3NoOjSKB1AjQArbPiyBYJjI+PH9aM4y8t/hbY4qzSDUt2hrtcge9VgCsHBgaurtfrW8pAoVarLV9YWDiyCRwtwHFQfS53ftxl539W8bzXTE1NXVuG9cEa+0eABqB/rEuRyff9EYh8FsDyUhTcepHJb/IXQ+RiD7gkDMPk63xeiwSCIHhyDJwA1RcCSP7sTTh/QGALVE+Pomg9uZBAWgRoANIiWfI4yY5+y4eGPiXAGSVH8UD5ySEw/yGq3xSRbx544IFXT05OxmSzNIGJiQnv1ltvPVJVT1KRk6D6HN4y2M5NgXO3zM29hTsILr2OOGJpAjQASzPiiCUI+L6/v4h8RYFjSg7rPoh8S1QvrFar/1Kv139bch6plF+r1R7TaDT+VEVOhupLAeyeSuD8BrkCqq+Ooug3+S2Byl0gQAPgQhdyrMEYc7QCX1l8JSzHlXQs/X4F/llUv9hsNv+VD2t1zLGlicnDpZVK5U9U5LUC/BmA3VqaWLxBtwnwKmvtlcUrjRX1iwANQL9IFzDPWBC8XlTPL+GHcAyRS0R1ffLNRxiGmwrYXudLCoIg2aPgVSoyAtUTSrit9P0qsmY6DJM9NniRQNsEaADaRsYJAMQY8/7FXf3KBORmASyAaWvtrWUq3PVajTEHAkj2nDDJXgSu601TX7J7oLX23Q/Z2CnN8IxVYAI0AAVubi9KW7t27bJNc3PJ5iSv60V812IqkOyYd6EHnGet/S4/ZF3r0CP0JOb0xBg4DcDJAiQ7HBb/EvnCyhUr/HXr1m0tfrGsMC0CNABpkSxBnORhrPmFhQsX39suesW3C3CeiJwXhmGy1S6vnBEIguAAVT1Nt5uB4u9IKHL54MDAyXz4NGcLNUO5NAAZws9T6pE1ax5fieNvQvWP86S7Xa0KXOsBnxgaGtrA36bapefm+ORbq7m5udUx8DYBDnNTZUqqRH7e9LyT1p9//i9TisgwBSZAA1Dg5qZV2uj4+BFeHH+j4L9FXRaL/O1MGCZ18ioogdEgeJmn+tcAnlfQEpOybo8972UzU1M/KnCNLC0FAjQAKUAscoix8fHnSxx/HcAeBa3zW57IB8Iw/F5B62NZOyAQBMFxseq7ACT7ChTxulc97+XTU1P/XsTiWFM6BGgA0uFYyChj4+N/KnE8W8iNV1QvEpH38D3qQi7dlovato+F6vsg8pKWJ+Vn4H3qecPTU1P/kh/JVNpPAjQA/aSdo1zGmNfFwAUFfIr6CvW8v+ZvRjlajH2QuvhN198COLYP6fqZoiHAiLX2H/uZlLnyQYAGIB996qtKPwh8qE4VaWMVAW5Q1f8XRVFyO4MXCeyQgO/7LxeRv1PgKQVClGxcNR6FYVSgmlhKCgRoAFKAWKQQvu+/ASLnJZv9FKSu5Njd9xx04IHnT05OJu/08yKBXRKYmJgYuOXWW9cguTUA7FMQXArV06Io+lxB6mEZKRAoyod8CigYwhhzhgKfKcIP/2QDH1E9e3Bw8L31ev337C4JtEugVqs9an5+/r0qcmZBboWpAG+y1p7bLguOLyYBGoBi9rXtqor0m78AlwA401p7fdsgOIEEHkbAGPNUAGcrkJw3kPeL3wTkvYMp6qcBSBFmXkMt3vMPC/Cb/x0q8jYejpLXlei27sXDrz4BYF+3lS6pTiES8JmAJTkVfgANQOFbvOsCk6f9FdhQgAf+wvmtW8/asGHD3SVvKcvvIYHVq1fvNbhs2ccABD1M04/QsQCr+XZAP1C7m4MGwN3e9FxZ8p4/4vjCXN/fVP2liKyx1l7cc2BMQAKLBIwxL9TkKGyRx+cYSkM97xTuE5DjDnYpnQagS4B5nb743vM3c7zJT/I15rnNRuPt69ev35zXPlB3fgmMjIysqFSrH4HqGTm+fZZsFnQS98XI7zrsRjkNQDf0cjp3cW//S/O6va8C/5281zwdhhfltAWUXSACY0HwkmTfDAH+T07Lujf2vON5dkBOu9eFbBqALuDlceq2U/2aze/n9WAfAb64devW03mvP4+rr7iak2cDli1b9lkFXpvTKm9vVirH8BTBnHavQ9k0AB2Cy+O0Wq32mPmFhctzeqTvZhV583QYJjsU8iIBJwmMBcG4qH4awAonBe5KlMjPBwcGnluv13+bO+0U3BEBGoCOsOVvUnIm+qbNm78L1efmTz2ug+proii6MYfaKblkBHzfPwQiXwJwaO5KF7l85YoVJ65bt25r7rRTcNsEaADaRpbLCeIb8w8AXpc39QLMVKvVM+r1+pa8ae+HXt+Y5EHOzK7I2pMyS+5w4lqttrzRaJyrwKjDMncsTeQLURiuBqC5007BbRGgAWgLVz4HG2M+oMA7c6Z+qwBvttYm5xLw2gkB35hMP6Qja/kZsovVaYw5TYHklsCyPC1iAT5orX1XnjRTa/sE+I+3fWa5mrG4e9kFuRIN3BZ73ikzU1P/mTPdfZdLA9B35G0nHB0ff7YXx18FcEDbkzOcoCKnclfNDBvQh9Q0AH2AnFUKY8zRCiSv++2WlYYO8l4B1VdHUfSbDuaWbgoNQD5a7vv+/hD5MoBj86F4m8r7BTjeWntljjRTahsEaADagJWnoYsfOD/M028dyf3+ubm5N8zOzs7niXWWWmkAsqTfXu7h4eHBoaGhz+XsuYDboPpMGvL2ep2X0TQAeelUGzoXP2guVeCYNqZlOTQ5oexdURR9KEsRecxNA5C/rvm+/zcQ+UCOdg+8YvPc3Ak05vlba0sppgFYilAO/37MmHMESLYnzcO1Fap+FEVfyINY1zTSALjWkdb0+L7/5xCJ8vJwoALnTlv7xtaq46i8EKAByEunWtTp+/4IRGZaHJ71sHugekoURclzCrw6IEAD0AE0R6b4vn88RJKHA/d0RNKuZaiORlG0PhdaKbIlAjQALWHKx6Dx8fHDmnGcPLCz3HnFqr8G8NIoiq5xXqvDAmkAHG5OC9J83z8cwLcg8tgWhmc9ZEvF846empq6NmshzJ8OARqAdDhmHmXbyWQDA8lDf0/OXMzSAm6C6ouiKPrV0kM5YlcEaADyvz58338cRL4D4OAcVPOzwWr1SG7MlYNOtSCRBqAFSHkYYoyZzsnTxdcvVKsvuqBeT74B4NUlARqALgE6Mv3UWu2xA41GYgKe6oikncpI3tax1o65rpP6liZAA7A0I+dHGGPGFEgeKHL6EuBH1Wr1JTxsJL020QCkxzLrSMlhXY1G4yIFjshay1L5BfCttdNLjePfu02ABsDt/iypbmxs7GDxvB8BWLnk4AwHKHCVqL44iqJ7MpRRuNQ0AMVqaXKscHXZsosEOMrxyjZpHB8xPT19k+M6KW8XBGgAcrw8JiYmBm7ZuPF7AI52uYzkh/+yavVF9Xr99y7rzKM2GoA8dm3Xmmu12qO2NhrfyYEJuPKgVauOm5ycXCheF8pREQ1AjvtsjJlU4D0ul5B87a+qL+Rv/r3pEg1Ab7hmHdX3/T1F5GLXbwcI8D5r7UTWvJi/MwI0AJ1xy3yW7/vPgsj3AVQyF7NzAdcPVqsv4D3/3nWIBqB3bLOOnDwTMN9o/JvjDwY2oXpMFEU/yJoX87dPgAagfWaZz/B9fzeIJPf9D8lczM4F3LRQrT6PT/v3tkM0AL3lm3X0IAgOiFX/3fFXBG+E6hFRFN2fNS/mb48ADUB7vJwYbYz5mAJ/6YSYHYnYvsnPsXzPv/cdogHoPeOsM2zbJwC4wuXNggT4uLX2rKxZMX97BGgA2uOV+ejRIDjGU00e/PMyF7NjAcn2vs/nDn/96Q4NQH84Z51l246BIsk3Aa5uGxzHIsfNhGFyW5JXTgjQAOSkUYnMxVP+fqzAUxyVnRzscxL39u9fd2gA+sc660yLZwd809UDhAS4YW5u7hk8NTDrldJ6fhqA1lllPtLxp/6TI31X81S//i4TGoD+8s462+IpghtcPUqYbwVkvULay08D0B6vzEb7vn8IRH4CYDAzEbtKrPrOKIo+5KS2AouiAShwc3dSmu/7fwORDzpa+TxUnx5F0Y2O6qOshxCgAcjHchDfmOR1oOe5KJd7g2fXFRqA7NhnmdkPghmojmSpYRe5L4usfQEAdVQfZS0SoAHIwVLwg8CHqnVU6hWb5+ZO4H2/bLpDA5AN96yzJs8DrRgauiR52yZrLTvML2KiMHT+fBIn2fVRFA1AH2F3kirZEQwiPwewTyfzezznNqg+M4qi3/Q4D8Pv7OtgYzL9LSuylp8hGa1O3/f3h0hyBPgBGUnYVdo7ofrH3AHUwc7wFoDbTXmoOj8I/h6qax1UvDX2vOfPTE39p4PaSiOJ3wCUptU7LHR0fPzZXhwnrwcuc46EyLooDP/COV0U9CABuneHF8Po6OjTvErlahe3+xXgdGvteQ7jK4U0GoBStHmXRRpjTlPgsw6SaMbN5pEzMzM/dVAbJbn6Kgk7s52Ab0xyj+9413jwoT93OkID4E4vslRijJlWYDRLDTvJfWlk7QkO6qIkGgB314Ax5pUKXOigwusGq9Vn1+v1LQ5qK50kGoDStXyHBddqteXzjUZyO+5Q14gIcLK19muu6aIegLcAHFwFtVqtOt9oXAfgSY7J2wzVo/iOrztdoQFwpxdZK1ncK+QqACuy1vKw/L8YrFYPrdfrDcd0lV4ODYCDS8AYc6YC61yTpiJrpsNwyjVdZdZDA1Dm7j+y9rEgGBfV812jIsBaa+3Zrukqux4aAMdWQBAEK2PVm1x77U+AL1prX+cYrtLLoQEo/RJ4BABjzD8q8FrHyNzpiRwchuEmx3SVWg4NgGPtd3G/fwX+u7F169M2bNhwt2O4Si+HBqD0S+ARAFavXr3X4LJl1wD4I5fo8JwAl7qxXQsNgEM9McbsEwM3CzDkkCxVkZOmw/AihzRRyiIBGgAuhR0RGAuCl4hqcnKgM5/xCsx5wBOstXeya24QcGZxuIEjWxV+EHwcqm/LVsXDsoucE4Xhm5zSRDEPEqAB4GLYGQE/CD4D1Tc6RUjkE1EY/qVTmkoshgbAkeafWqs9dqDRuBnAbo5IAlR/2Ww2D1+/fv1mZzRRyB8QoAHggtgZgZGRkRWVSuUaiDzeIUr3L1SrT7igXv+1Q5pKK4UGwJHWG2M+rYBT22YKcKK19mJHEFHGDgjQAHBZ7IrA2NjYieJ533GJkgB/b619s0uayqqFBsCBzq9Zs2a/hWbzlwB2d0DOAxLCyNpxh/RQCg0A10AHBHxjkld3gw6m9mrKfQOVyuPPP//823uVgHFbI0AD0Bqnno4aM+ajApzV0yTtBb9jfuvWQ/jUf3vQshjNbwCyoJ6vnItvBdwIYF9nlKt+NIqitzujp6RCaAAybvzo6OjeXqVyi0u7d6nIqdNh+PmM0TB9CwRoAFqAxCEYC4LXi+oFDqHYHDebB83MzNzlkKbSSaEByLjlfhC8F6oTGct4ML0Al1hrX+iKHurYNQEaAK6QVgkYYy5WwJ2DeVTfG0XRZKv6OS59AjQA6TNtOeK2p3QHBpLf/vdueVIPByqw4AFPt9Ze38M0DJ0iARqAFGEWPJQx5qkx8BMBBhwp9a7mwsJBfMsou27QAGTHHs7t+a/6qSiK3pohEqZukwANQJvASj7c9/1PQuQtrmDgGQHZdoIGICP+ExMT3i0bN/4cwMEZSXh42jsHq9Un1ev13zuihzJaIEAD0AIkDnmQQK1We9R8o/ELh84auemgVav+eHJyMmab+k+ABqD/zLdl9H3/ZIh8NaP0j0wrckYUhp91Rg+FtESABqAlTBz0EAJ+EJwO1XNdgSLAydbar7mip0w6aAAy6rZLD+QIcMOqVaueNjk5uZARDqbtkAANQIfgSjxtYmJiYOPGjT9V4CkuYOCDx9l1gQYgA/bj4+OHNeM4Oa3LjUv1FVEUfd0NMVTRDgEagHZocewDBMaC4BWi6sxv3RXPO3xqaupadqi/BGgA+st7WzbHDum4IrL2uRlgYMoUCNAApACxpCF8Yy4HcKwT5fPQsUzaQAPQZ+xBEKxsqt7mypG/6nkvmJ6a+vc+Y2C6lAjQAKQEsoRhjDEvUOBSF0pPjgquiBwQhuEmF/SURQMNQJ87bYw5TQE3HrZTvSiKopf2GQHTpUiABiBFmCUM5fv+tyDyEhdKF+B0a+15LmgpiwYagD532hhztQJH9DntDtMJ8Bxr7ZUuaKGGzgjQAHTGjbO2EzDGHK3Af7jAQ4AfWWuPdEFLWTTQAPSx08aYIxX4YR9T7irVtyJrT3JEC2V0SIAGoENwnPYgAce+BXimtfZqtqc/BGgA+sN5Wxbf98+GyJv6mHKnqTyR54Vh+D0XtFBD5wRoADpnx5nbCQRBcFysepkTPFQ/E0XRmU5oKYEIGoA+NXnt2rXLNs3N/QbAnn1Kuas0l0XWPt8BHZTQJQEagC4Bcvo2AmPGXCbAcQ7guGfl0ND+69at2+qAlsJLoAHoU4uNMa9RYLZP6XaZJhb5k5kw/IYLWqihOwI0AN3x4+ztBEaD4GWe6r+6wEOAYWvtl1zQUnQNNAB96rBvzIUAXtmndDtNo8C109YenrUO5k+HAA1AOhwZZdu3ANcIcJgDLL4WWXuyAzoKL4EGoA8tHh8ff3QzjpOv/6t9SLfLFAIE1lqbtQ7mT4cADUA6HBll2xsBRoHQARaN+a1b99uwYcPdDmgptAQagD601/f9N0Ck3odUS6W4feXQ0EG8v7YUpvz8PQ1AfnrlutLF55RuAbBf5lpVa1EUfS5zHQUXQAPQhwaPGfNtAV7Uh1RL/fb/PmvtRPlOVBMAACAASURBVNY6mD89AjQA6bFkpG3fAkwq8J6sWSjwnWlrX5y1jqLnpwHocYeNMfso8GsAlR6n2mV4BRYqIgeFYXhbljqYO10CNADp8ix7tCAIDmiq3iLAQMYsmgI81lp7Z8Y6Cp2eBqDH7R0zpiZA5ttbKvClaWuHe1wuw/eZAA1An4GXIN2YMbMCvCbrUhU4bdpaF26dZo2iZ/lpAHqGdntgV3bZEuDF1trv9Lhchu8zARqAPgMvQTpjzIsU+LYDpXK30h43gQagh4B9398TInc48PT/zZG1TwSgPSyXoTMgQAOQAfTipxTfmP8C8ISMS20MVqv71Ov132eso7DpaQB62Frf9/8cIv/QwxQthRbg3dbaD7Q0mINyRYAGIFftyo1YY8y7FHh/5oJV/28URV/IXEdBBdAA9LCxvjGfB7C6hylaCR0L8Dhr7a2tDOaYfBGgAchXv/Ki1hhzoAK/AuBlrHlDZO3rM9ZQ2PQ0AD1q7fDwcGXFypV3QnWvHqVoLazId6MwzPwVxNbEclS7BGgA2iXG8a0S8IPgO1A9sdXxPRkncvfmTZv2mZ2dbfYkfsmD0gD0aAG4csKWAL61drpHZTJsxgRoADJuQIHT+0HgQzXzXUM1jo+bnp6+vMCoMyuNBqBH6MeMeb8A7+pR+FbD3u+J7BuG4aZWJ3BcvgjQAOSrX3lSGwTBylj1dgC7Z6pb9f1RFGW+OVGmDHqUnAagR2DHjPmBAEf1KHxLYfnuf0uYcj2IBiDX7XNevG/MFwFkun+IAldNW/ss52HlUCANQA+atnj4T7KDVbYP0Ki+NooiJ44g7gFmhkz2mdh2fkt2V2QtP0Oyw9/zzL7vD0MkMQFZXnHF8/aZmpr6XZYiipib/3h70FVjzGsUyPoH733NhYV91q9fv7kHJTKkIwRoABxpREFljIyMrKgMDCS/zGR6G0BFXjMdhl8uKObMyqIB6AF63/fPhsibehC69ZAiF0ZheErrEzgyjwRoAPLYtXxp9oPgq1A9OVPVqp+JoujMTDUUMDkNQA+aaoy5XoGn9CB0yyH59H/LqHI9kAYg1+3LhXhH3ga4PrL20FwAy5FIGoCUmzUyMrJvZWDgNwCyZNscrFb3r9frv025PIZzjAANgGMNKaCcWq32mPlGI/lMy/JEU20uLOy/fv36ZGt1XikRyPKHVEoluBXG9/1XQSTbe1Uil0dheJxbZKimFwRoAHpBlTEfTsAPgu9B9bmZklF9dRRFX8lUQ8GS0wCk3FA/CD4O1belHLatcNz7vy1cuR5MA5Dr9uVGvAtnAwjwcWvtWbmBlgOhNAApN8k35vsAnpNy2LbCeSLPCsPwqrYmcXAuCdAA5LJtuRMdBMFRseoPshQuwPettcdmqaFouWkAUuzo8PDw4IqhoXsBLEsxbLuh7jpo1ap9Jycn43Yncnz+CNAA5K9neVQ8MTHh3bJxY3L/fe8M9W/dPDe3x+zs7HyGGgqVmgYgxXaOjo8/24vjK1MM2Umo2cja13YykXPyR4AGIH89y6tiF3YFjD3v6Jmpqf/MK0PXdNMApNgR3/ffCJHPpBiy/VAiZ0Rh+Nn2J3JGHgnQAOSxa/nU7AfB6VA9N1P1qm+KouicTDUUKDkNQIrNHDMmFMCkGLLtUJ7IIWEY/qztiZyQSwI0ALlsWy5FB0Hw5Fj1xizFK2CnrQ2y1FCk3DQAKXbTN+bHAJ6eYsh2Q90ZWbtvu5M4Pr8EaADy27s8KveNSZ4D2CdD7T+JrH1GhvkLlZoGIKV21mq16nyjkey7X00pZPthuP1v+8xyPoMGIOcNzJl8B7YFbgxWqyvq9XojZ+iclEsDkFJbfN9/BkR+lFK4jsKoyFnTYfjxjiZzUi4J0ADksm25FW2MOUuBj2ZagOoRURQl37by6pIADUCXAB+Ybow5VYH1KYXrKIwn8rwwDL/X0WROyiUBGoBcti23ooMgOC5WvSzLAgQYsdZekKWGouSmAUipk8aYv1Pg7SmF6yRMsv//HvV6fUsnkzknnwRoAPLZt7yqrtVqy+cbjWSvk8zOBRDgI9ba/5dXhi7ppgFIqRu+7/8zRP40pXCdhLkmsvZpnUzknPwSoAHIb+/yqnzMmGsEOCwz/ar/EkXRn2WWv0CJaQBSaqZvzH8BODilcO2HUY2iKMr0FcT2RXNGtwRoALolyPntEvB930LEb3deiuNviqx9YorxShuKBiCF1vu+vxtE5rL8Wgyqb4mi6NMplMMQOSJAA5CjZhVEqu/7b4bIpzIspwnVoSiK7s9QQyFS0wCk0MaxsbFDxfOuTSFU5yFUT4ii6NLOA3BmHgnQAOSxa/nW7Pv+8RC5JMsqNI4Pm56evi5LDUXITQOQQhd93z8ZIl9NIVTHIeJm8zEzMzN3dRyAE3NJgAYgl23LtejR0dG9vUrlt1kWIcDJ1tqvZamhCLlpAFLoojHmrQp8IoVQnYa4PbJ2/04nc15+CdAA5Ld3eVbuG/MbAPtlVYMAb7PWfjKr/EXJSwOQQid93z8bIm9KIVSnIS6NrD2h08mcl18CNAD57V2elfvGJLcAjs+sBtXPRFF0Zmb5C5KYBiCFRvrG/BOAl6cQqtMQ50XWnt7pZM7LLwEagPz2Ls/KfWOSE0dPy7CGr0fWviLD/IVITQOQQhv9IPgJVDN7B59fh6XQxJyGoAHIaeNyLjvz254iP43CMMuD13Lewe3yaQBSaKNvzN0A9kwhVEch+EBMR9gKMYkGoBBtzF0RxphXKnBhZsJF7o7C8NGZ5S9IYhqALhs5PDy8+4qhoWy331V9WhRF13RZCqfnkAANQA6bVgDJvu8fDpGfZlnK5rm55bOzs/dlqSHvuWkAuuzg2NjYweJ5yS6AmV3Ld9995TnnnJNsRMSrZARoAErWcEfKDYJgZayanAmQ2aVx/MTp6embMhNQgMQ0AF020YHTse6JrN2ryzI4PacEaABy2rgCyM761idPP+1+EdEAdMlwNAhO8VS/0mWYbqZfF1mb3cEcO1DuG/NNAC/tpijOzQeByFp+huSjVamr9I1Jdj89NPXALQaMRV41E4aZbsDWolRnh/Efb5etMcacpkDySkxW17cja1+SVfId5aUBcKkbvdVCA9Bbvi5H9425CMCLs9IowOnW2vOyyl+EvDQAXXbRD4J3Q/V9XYbpZvp0ZG2WJ3M9QjsNQDftzNdcGoB89StNtb4xEYCxNGO2E0uAd1trP9DOHI79QwI0AF2uCN/3PwmRt3QZpvPpqh+NoujtnQdIfyYNQPpMXY1IA+BqZ3qvy/f9j0Dkr3qfaScZVD8VRdFbM8tfgMQ0AF020RgzrcBol2E6ni7AX1lrP9ZxgB5MpAHoAVRHQ9IAONqYPsgyxpylwEf7kGqHKQSYsdZm9g1EVnWnmZcGoEuafhB8Faondxmm4+kCBNZa23GAHkykAegBVEdD0gA42pg+yDLGGAXCPqTacQqRC6MwPCWz/AVITAPQZRN9Y74L4IVdhul8uuopURRltyPXDpTTAHTezrzNpAHIW8fS0+vAMegXR9aemF5F5YtEA9Blz31jrgLwzC7DdDxdgOOttf/WcYAeTKQB6AFUR0PSADjamD7IMsa8QIFL+5BqhykUuGra2mdllb8IeWkAuuyib8wNAA7pMkzH0wV4prX26o4D9GAiDUAPoDoakgbA0cb0QZYx5kgFftiHVDtLcWNk7VMyzJ/71DQAXbbQN2YjgAO7DNP5dNU/jqLoF50HSH8mDUD6TF2NSAPgamd6r8v3/SdB5Oe9z7TTDBsjaw/KMH/uU9MAdNlC35jbAezbZZiOp8fN5v+ZmZn5n44D9GAiDUAPoDoakgbA0cb0Qdbo6OgfeZXKf/ch1c5S3BFZu1+G+XOfmgagyxb6xtwD4FFdhul4esXz9p6amvpdxwF6MJEGoAdQHQ1JA+BoY/oga3R0dG+vUvltH1LtLAXPQekSPg1AlwB9Y5LjKHfrMkzH0wer1RX1ej3b44gfpp4GoON25m4iDUDuWpaa4Fqttny+0dicWsD2A90fWbt7+9M44wECNABdroUxYxoCDHQZpuPpg9XqYL1eb3QcoAcTaQB6ANXRkDQAjjamD7JqtVp1vtGY70OqHaZQYGHa2mpW+YuQlwagyy76xjQBeF2G6Xh6ZG2SWzsO0IOJNAA9gOpoSBoARxvTH1niGxP3J9UOs8SRtZUM8+c+NQ1Aly3keeyPBEgD0OWiytF0GoAcNasHUvn51wOofQxJA9AlbP4DoAHocgnlejoNQK7b17V4fv51jTDTADQAXeLnLQAagC6XUK6n0wDkun3diuctgG4JZjyfBqDLBvAhQBqALpdQrqfTAOS6fV2J50OAXeFzYjINQJdt4GuANABdLqFcT6cByHX7uhLP1wC7wufEZBqALtvAjYBoALpcQrmeTgOQ6/Z1JX58fPzRzTi+q6sg3U3mRkDd8QMNQJcAuRUwDUCXSyjX02kAct2+rsRzK+Cu8DkxmQagyzbwMCAagC6XUK6n0wDkun1diedhQF3hc2IyDUCXbeBxwDQAXS6hXE+nAch1+7oSz+OAu8LnxGQagC7b4BtzFYBndhmm4+kCHG+t/beOA/RgIjcC6gFUR0PSADjamD7IMsa8QIFL+5BqhykUuGra2mdllb8IeWkAuuyib8x3AbywyzCdT1c9JYqiCzsPkP5MGoD0mboakQbA1c70Xpfv+ydD5Ku9z7TTDBdH1p6YYf7cp6YB6LKFfhB8Faondxmm4+kCBNZa23GAHkykAegBVEdD0gA42pg+yDLGGAXCPqTacQqRC6MwPCWz/AVITAPQZRONMdMKjHYZpuPpAvyVtfZjHQfowUQagB5AdTQkDYCjjemDLGPMWQp8tA+pdphCgBlr7VhW+YuQlwagyy76vv9JiLylyzCdT1f9aBRFb+88QPozaQDSZ+pqRBoAVzvTe12+738EIn/V+0w7yaD6qSiK3ppZ/gIkpgHosol+ELwbqu/rMkw306cja/1uAqQ9lwYgbaLuxqMBcLc3vVbmGxMByOw3cAHeba39QK/rLHJ8GoAuu2uMOU2Bz3YZppvp346sfUk3AdKeSwOQNlF349EAuNubXivzjbkIwIt7nWdn8QU43Vp7Xlb5i5CXBqDLLo4GwSme6le6DNPN9Osiaw/rJkDac2kA0ibqbjwaAHd702tlvjHXAji013l2Fj8WedVMGGb5FkJWpaeWlwagS5RBEBwXq17WZZhupnM/7G7ocS4JkEBHBHxj7gawZ0eTU5jkiTwvDMPvpRCqtCFoALps/djY2MHief/VZZiupi/fffeV55xzzlxXQTiZBEiABFokEATBylj13haH92SYxvETp6enb+pJ8JIEpQHostHDw8O7rxga2tJlmO6mqz4tiqJrugvC2SRAAiTQGgHf9w+HyE9bG92bUZvn5pbPzs7e15vo5YhKA5BCn7P+KkyAk621X0uhFIYgARIggSUJGGNeqUB2O5CK3B2F4aOXFMoBuyRAA5DCAvGD4CdQfVoKoToKIcDbrLWf7GgyJ5EACZBAmwSMMW9V4BNtTktvuMhPozB8enoByxmJBiCFvvvG/BOAl6cQqtMQ50XWnt7pZM4jARIggXYI+MYkrz6f1s6clMd+PbL2FSnHLF04GoAUWu77/tkQeVMKoToNcWlk7QmdTuY8EiABEmiHgG/MJQCOb2dOqmNVPxNF0ZmpxixhMBqAFJqe+ddhwO2RtfunUApDkAAJkMCSBHxjfgNgvyUH9mgAb3umA5YGIAWODhyLibjZfMzMzMxdKZTDECRAAiSwUwKjo6N7e5XKb7NExAef06FPA5ACx7GxsUPF85JdsbK7VE+IoujS7AQwMwmQQBkI+L5/PESSWwCZXRrHh01PT1+XmYCCJKYBSKGRvu/vBpFkI55KCuE6C6H6liiKPt3ZZM4iARIggdYI+L7/Zoh8qrXRPRnVhOpQFEX39yR6iYLSAKTUbN+YZDfAg1MK134Y1SiKItP+RM4gARIggdYJ+L5vIZLlCaQ3RdY+sXXFHLkzAjQAKa0N3/f/GSJ/mlK4TsJcE1mb2V4EnQjmHBIggfwRGDPmGgGyO4BM9V+iKPqz/JFzTzENQEo9Mcb8nQJvTylcJ2Gag9XqHvV6PdttiTtRzjkkQAK5IFCr1ZbPNxrJGQCZ3e4U4CPW2v+XC2COi6QBSKlBvu+PQGQmpXAdheHpWB1h4yQSIIEWCThw+ikEGLHWXtCiZA7bBQEagJSWh+/7z4DIj1IK11EYFTlrOgw/3tFkTiIBEiCBJQgYY85S4KOZglI9IoqiH2eqoSDJaQBSamStVqvONxqbAVRTCtl+GJELozA8pf2JnEECJEACSxPwg+CrUD156ZE9G9EYrFZX1Ov1Rs8ylCgwDUCKzfaNSVxplgdU3BlZu2+KJTEUCZAACTxIwDfmDgD7ZIjkJ5G1z8gwf6FS0wCk2M4xY0IBMn0VzxM5JAzDn6VYFkORAAmQAIIgeHKsemOWKBSw09YGWWooUm4agBS76fv+GyHymRRDth9K5IwoDJOTuniRAAmQQGoE/CA4Harnphawk0Cqb4qi6JxOpnLOIwnQAKS4KkbHx5/txfGVKYbsJNRsZO1rO5nIOSRAAiSwMwK+MV8EMJwlodjzjp6ZmvrPLDUUKTcNQIrdHB4eHlwxNJS8I7ssxbDthrrroFWr9p2cnIzbncjxJEACJLAjAhMTE94tGzcm9//3zpDQ1s1zc3vMzs7OZ6ihUKlpAFJup2/M9wE8J+WwbYXzRJ4VhuFVbU3iYBIgARLYCYEgCI6KVX+QJSABvm+tPTZLDUXLTQOQckf9IPg4VN+Wcti2wgnwbmvtB9qaxMEkQAIksBMCxph3KfD+LAEJ8HFr7VlZaihabhqAlDvq+/6rIPLllMO2F07k8igMj2tvEkeTAAmQwI4J+EHwPag+N1M+qq+OougrmWooWHIagJQbOjIysm9lYOA3QLJjZWZXci7A/vV6/beZKWBiEiCBQhCo1WqPmW80bgfgZViQCrCftfbODDUULnWWP6QKB/OBgowx1yvwlCwLFMC31k5nqYG5SYAE8k/ADwIfqjbjSq6PrD00Yw2FS08D0IOW+r5/NkTe1IPQrYfktsCts+JIEiCBnRJwYPtfQPUzURSdyTalS4AGIF2e26IZY16jwGwPQrcT8r7mwsI+69evT84n4EUCJEACbRMYGRlZURkYSL52373tySlOUJHXTIdhts9WpViPK6FoAHrQifHx8Uc34zj5R5PlPbPENb82iqKsjUgPCDMkCZBAPwj4vj8MkWQDoCyvuOJ5+0xNTf0uSxFFzE0D0KOujhnzAwGO6lH4lsIq8KVpazPduasloRxEAiTgJAEXdv9T4Kppa5/lJKCci6IB6FEDx4x5vwDv6lH4VsPe74nsG4bhplYncBwJkAAJJASCIFgZqyZP/2f69T9U3x9F0XvYlfQJ0ACkz3RbxCAIjotVL+tR+JbD8m2AllFxIAmQwEMIOPL0PzSOj5uenr6czUmfAA1A+ky3RRweHq6sWLnyTqju1aMUrYUV+W4Uhi9qbTBHkQAJkMB2An4QfAeqJ2bKQ+TuzZs27TM7O9vMVEdBk9MA9LCxvjGfB7C6hylaCR0L8Dhr7a2tDOYYEiABEjDGHKjArzJ/kBnYEFn7enakNwRoAHrDdbuD9v0/h8g/9DBFS6F5NkBLmDiIBEhgkYALe/9vk6L6f6Mo+gIb0xsCNAC94fqAAdgTIskRmtUepmkl9M2RtU9M/jm1MphjSIAESk1AfGP+C8ATMqbQGKxW96nX67/PWEdh09MA9Li1vu9/CyIv6XGaJcML8GJr7XeWHMgBJEACpSZgjHmRAt92AMK3ImtPckBHYSXQAPS4tWPG1AQ4r8dplgzPPQGWRMQBJEACAMaMmRXgNVnDUOC0aWvrWesocn4agB531xizjwK/BlDpcapdhldgoSJyUBiGt2Wpg7lJgATcJRAEwQFN1VsEGMhYZVOAx/L0v952gQagt3y3RR8z5tsCZP4qngDvs9ZO9KFkpiABEsghAWPMpAKZb7qjwHemrX1xDhHmSjINQB/a5fv+GyDiwldZt68cGjpo3bp1W/tQNlOQAAnkiMDatWuXbZqbuwXAfpnLVq1FUfS5zHUUXAANQB8avHg40G8ceBsAAgTW2qzP9u4DdaYgARJoh4AxxigQtjOnR2Mb81u37rdhw4a7exSfYRcJ0AD0aSn4xlwI4JV9SrfTNApcO23t4VnrYH4SIAG3CIwZc40Ahzmg6muRtSc7oKPwEmgA+tRiY8xrFHDiaN5Y5E9mwvAbfSqdaUiABBwnMBoEL/NU/9UFmQIMW2u/5IKWomugAehThxfvryW3AfbsU8pdpbkssvb5DuigBBIgAQcIjBlzmQDHOSDlnpVDQ/vzOaX+dIIGoD+ct2Xxff9siLypjyl3msoTeV4Yht9zQQs1kAAJZEfAlZNLtxFQ/UwURWdmR6NcmWkA+thvY8yRCvywjyl3lYq7bDnSCMoggSwJuLJbacJAgGdaa6/OkkeZctMA9LnbxpirFTiiz2l3mE6A51hrr3RBCzWQAAn0n4Ax5mgF/qP/mR+ZUYAfWWuPdEFLWTTQAPS508aY0xT4bJ/T7jid6kVRFL3UCS0UQQIk0HcCjv32f7q1NvNt0/vehAwT0gD0GX4QBCubqrcJMNTn1DtMp573gumpqX93QQs1kAAJ9I+AMeYFClzav4w7z6TAXEXkgDAMN7mgpywaaAAy6LQfBJ+B6hszSL2jlFdE1j7XES2UQQIk0CcCvjGXAzi2T+l2nUbknCgMnXhA2gkefRJBA9An0A9NMz4+flgzjq/JIPWOU6q+Ioqirzujh0JIgAR6SmAsCF4hql/raZI2glc87/Cpqalr25jCoSkQoAFIAWInIYwxFytwQidz054jwA2rVq162uTk5ELasRmPBEjALQITExMDGzdu/KkCT3FBmQCXWGtf6IKWsmmgAcio477vnwyRr2aU/pFpRc6IwtCNhxOdgUIhJFA8An4QnA7Vc12pTICTrbXOfBvhCpd+6KAB6AflHeSYmJjwbtm48ecADs5IwsPT3jlYrT6pXq//3hE9lEECJJAygVqt9qj5RuMXAPZJOXRH4RT4r8etWvXkycnJuKMAnNQVARqArvB1N9kYc6YC67qLkuJs1U9FUfTWFCMyFAmQgEMEfN//JETe4ookAdZaa892RU/ZdNAAZNjxkZGRFZWBgeT87b0zlPFgagUWPODp1trrXdBDDSRAAukRMMY8NQZ+IsBAelG7inRXc2HhoPXr12/uKgond0yABqBjdOlM9IPgvVCdSCda91H4QE73DBmBBFwk4NKDx9v4qL43iqJJF1mVRRMNQMadHh0d3durVJJvAVZkLOV/vwkQOXU6DD/vih7qIAES6I7AWBC8XlQv6C5KqrM3x83mQTMzM3elGpXB2iJAA9AWrt4MHjPmowKc1ZvoHUW9Y37r1kM2bNhwd0ezOYkESMAZAqtXr95rcNmyGwHs64wo1Y9GUfR2Z/SUVAgNgAONX7NmzX4LzeYvAezugJwHJISRteMO6aEUEiCBDgj4xkwBCDqY2qsp9w1UKo8///zzb+9VAsZtjQANQGucej7KGPNpBf6i54naSCDAidbai9uYwqEkQAIOERgbGztRPO87DklKjvz9e2vtm13SVFYtNACOdP7UWu2xA43GzQB2c0RS8pDOL5vN5uF8SteZjlAICbRMYNtbRpXKNRB5fMuTej/w/oVq9QkX1Ou/7n0qZliKAA3AUoT6+Pd+EHwcqm/rY8qlU/GQjqUZcQQJOEjAsUPHthMS+UQUhn/pIK5SSqIBcKjtxph9YuBmV44KXkSjKnLSdBhe5BAqSiEBEtgFgbEgeImofjP5kesKqOTIXw94grX2Tlc0lV2HM4uj7I14oH5jzKQC73GJhwL/3di69Wl8K8ClrlALCeyYwOJT/8lpo3/kEiMB3metdWbPE5fYZKWFBiAr8jvJGwTBylj1Jlf26n5ApgBftNa+zjFclEMCJPAwAsaYf1TgtY6BudMTOTgMw02O6Sq1HBoAB9vv3BkBD9wLEFkzHYbJK0W8SIAEHCQwFgTjonq+a9K4579rHdmuhwbAwb7UarXqfKNxHYAnOSZvM1SPiqIo2VSEFwmQgEMEfN8/BCI/BLDcIVmJlF8MVquH1uv1hmO6Si+HBsDRJWCMeaUCFzoo77rBavXZ9Xp9i4PaKIkESkmgVqstn280/hPAoa4BEOBka+3XXNNFPfwGwOk14BtzCYDjXRMpwIy1dsw1XdRDAmUlYIyZVmDUwfovjaw9wUFdlMRbAG6vgdHR0ad5lcrVACquKRXgdGvtea7poh4SKBsBY8xpCnzWwbqbcbN55MzMzE8d1EZJNADurwE/CP4eqmsdVLo19rznz0xNJV878iIBEsiAwOj4+LO9OP53AMsySL/rlCLrojB0antz5xhlLIjPAGTcgKXS+76/J0R+7tprgYu6b4PqM6Mo+s1SdfDvSYAE0iXg+/7+iw/9HZBu5FSi3QnVP46i6J5UojFITwjQAPQEa7pB/SDwoWrTjZpatCs2z82dMDs7O59aRAYiARLYJYHh4eHBoaGhSxU4xklUIiYKw8hJbRT1IAEagHwsBvGN+TcAz3NRLh8KdLEr1FRkAn4QzEB1xNEaL4usfQEAdVQfZS0SoAHIyVJYfMf3JwAGnZSs+s4oij7kpDaKIoECEfB9/28g8kFHS5qH6tO5V4ij3XmYLBqAfPRpm0oXzwl4CD6F6uooir6QI6SUSgK5IuD7/p9DZIOrD3Bzv/9cLSfuBJindi3e9/uxAk9xVPdWqJ4URdGljuqjLBLILQHf94+HSHLCn3tP/G93JDfMzc09g88D5WeJ8RuA/PRqm9LRIDjGU/0eAM9R6fdAbtPdzQAAFr1JREFU9flRFCWnkfEiARJIgYDv+4dDJHndb88UwvUiRByLHDcTht/vRXDG7A0BGoDecO1pVGPMxxT4y54m6Sa46q8BHBtF0a+6CcO5JEACgO/7jwNwBUQe6yoPAT5urT3LVX3UtWMCNAA5XBm+7+8GkR8BOMRh+TctVKvPu6BeT8wALxIggQ4IBEFwQKya/OZ/cAfT+zXlRqgeEUXR/f1KyDzpEKABSIdj36P4vv8siCRftzm3TfBDYFw/WK2+oF6v/7bvgJiQBHJOoFarPWa+0Uhe/32qw6U0oXpMFEU/cFgjpe2EAA1AjpeG428FbCMrwI+2bt164oYNG+7OMWpKJ4G+Eli9evVey5Yt+64CR/Q1cZvJ+NR/m8AcG04D4FhD2pEzMTExcMvGjckDgUe3M6/fYxW4alm1+qJ6vf77fudmPhLIG4FarfaorY3GdwQ4ynHtVx60atVxk5OTC47rpDx+A1DMNTA2NnaweF7yPMBKlytMTICovph7g7vcJWrLmkDym3912bKLcvDDf5PG8RHT09M3Zc2M+TsnwG8AOmfnzExjzJgCzu+7ndwOqFarL+EzAc4sHQpxiEByz7/RaFzk+tf+CTIBfGvttEP4KKUDAjQAHUBzcYoxZlqBURe1PUzT9Z7Ii8MwvC0HWimRBPpCYPFp/287/sDfNhY8+6MvS6IvSWgA+oK590lGRkZWVAYGfgjgyb3P1nWGm6D6Iu4T0DVHBigAgW3v+Yt8x/FX/R4gfeNgtfrMer2+pQDoS18CDUCBlsD4+PhhzTi+EsBy58vavlnQS7ljoPOdosAeEti2wx/wLZc3+XlI+Vsqnnf01NTUtT1EwtB9JEAD0EfY/Ujl+/4IRGb6kSuFHMm2wafw7IAUSDJE7ggs7u3/VYe39/1DpqqjURStzx1oCt4pARqAAi6OMWPOEeCMnJSWHCDk8xTBnHSLMlMhsHiqX/LgrpMH+zy8SAXOnbb2jakUzyDOEKABcKYV6QlJTg1cMTR0SbIff3pRexopOUr4XVEUfainWRicBBwg4Pv+30DkA64e6bsDRFdsnps7gaf8ObB4UpZAA5AyUFfC+b6/P0SShwIPcEXTkjpE1m/etGkNP2iWJMUBOSSwzZivXHk+VEdyJP82qD4ziqLf5EgzpbZIgAagRVB5HGaMOVqBSwHsliP9V0D11fzAyVHHKHVJAokhF5GvKHDMkoPdGXC/AMdba5MHi3kVkAANQAGb+tCSxoLg9aJ6Qc7KvC32vFNmpqb+M2e6KZcEHkFgdHz82V4cJw/75efbOAAqcup0GH6eLS0uARqA4vb2wcqMMR9Q4J05K3WrAG+21p6XM92USwIP/bd3mgKfzsvDfg8IF+CD1tp3sZXFJkADUOz+Pvjv2TfmHwC8Lm/lJruOVavVM7jxSN46V269tVpteaPRODcnu3P+YbNEvhCF4erkS4Byd7H41dMAFL/H2ypcu3btsk2bN38Xqs/NYcnXQfU1URTdmEPtlFwyAr7vHwKRLwE4NHeli1y+csWKE9etW7c1d9opuG0CNABtI8vvhOSwkfmFhcuh+sc5rGKzirx5OgyncqidkktCYCwIxkX173OxG+fDeyLy83hh4diZmZm7StKu0pdJA1CyJTCyZs3jK83m9wHsl8fSBfji1q1bT9+wYcPdedRPzcUkkBzju2zZss8q8NqcVnh7s1I5Zv355/8yp/opuwMCNAAdQMv7lNHx8SO8OE5eD9wjp7X8j4oE02F4UU71U3aBCIwFwUtENQTwRzkt697Y846fmZr6UU71U3aHBGgAOgSX92lj4+PPlzj+JoDdc1qLQuTcZqPx9vXr12/OaQ2UnWMC207grFY/AtVk2+28fpbep5530vTU1L/nuBWU3iGBvC7aDsvltIcSGBsf/1PE8YUCDOSWjOovVfUN09PT381tDRSeOwJjY2MnisjnIPL43In/X8EN9bxTpqem/iXHNVB6FwRoALqAV4SpxpjXKbABgJfzesL5rVvP4rMBOe+i4/KTe/2Dy5Z9DEDguNSl5MUCrLbW/uNSA/n3xSVAA1Dc3rZcmR8EPrbfw8z7erhDRd7G3ctabj0HtkFgcVfNTwDYt41pLg5Nbp8FURgmpxHyKjGBvH/gl7h16Zbu+/4bIJLsupf7NSFAchLimdba69OlxGhlJGCMeSqAsxU4oQD1JydvnhZF0ecKUAtL6JJA7j/su6yf0x9CwBhzhgKfKYIJUGBBVM8eHBx8b71e/z0bTQLtEqjVao+an59/r4qcmevnZP63cBXgTdbac9tlwfHFJEADUMy+dlxVkb4JWIRwJ0Tec9CBB54/OTm50DEYTiwNgYmJiYFbbr11DVTfB2CfghTO3/wL0sg0y6ABSJNmQWItPhOQ7LiX9wcDH+yIADfEIu+YDsN/KkibWEYPCIwFwSs81Q8r8JQehM8qZBMia3jPPyv87ualAXC3N5kqW3w7YD2AaqZC0k9+hXreX/O95/TB5jmiMeYFCnwIwLF5rmMH2hsCjPBp/4J1NaVyaABSAlnEMMk+ARLHszneLGjnbVG9SETeY629soi9Y02tETDGHK3JV/0iL2ltRq5GJZv8DPM9/1z1rK9iaQD6ijt/yRZ3DPx6jrcN3jV01Ys8z3t/GIbfy193qLhTAkEQHBfH8bsL+oM/wXKvet7L+U1XpyukHPNoAMrR566qXDw74Bt5PUCoxeIvi0X+diYMkzp5FZTAaBC8zFP9awDPK2iJSVm3x573Mu7tX+AOp1QaDUBKIIseZtspgsnZAfk8Srjl9ihwrQd8YmhoaAPPRG8Zm9MD165du2xubm51DLxNgMOcFtutOJGfNz3vJJ7q1y3IcsynAShHn1OpslarPWZ+YeFCqD43lYBuB7ldgPNE5LwwDG9zWyrV7YhAEAQHqOppCpxW8G+vtpcvcnm8sPDKmZmZu7giSKAVAjQArVDimAcJJL9Nbdq8OYLqn5cBS7KhEIALPeA8a21y4JCWoe4c1yjGmBPj7T/0Ty7IBj5Lt0PkCytXrPD5rdXSqDjifwnQAHA1dEIg+ZB9vwLv7GRyjufcLIAFMG2tvTXHdRROujHmQABjChgATyhcgbsoSIAPWmvfTXNapq6nUysNQDocSxll8XCU8wHsVjIAMUSS8wYu8IAvh2G4qWT1O1FuEAQrY+DVAE6FarJPf2E2rmoR8P0qsoaHX7VIi8MeQYAGgIuiKwLb3qMGvgLggK4C5Xfy/Qr8s6h+sdls/uv69es357cU95WPjIysqFQqfwKRYQB/Vsg9Klprw20CvIr7WLQGi6N2TIAGgCujawK+7+8PkS8XcBe1dtncB5FvAfja4MDAP9fr9d+2G4DjH0lg8eHT5If9K6H60hL/0H8AzhVQfXUURb/heiGBbgjQAHRDj3MfJDA8PDy4fGjoUwKcQSzbCCT7r/+HqH5TRL554IEHXj05ORmTzdIEJiYmvFtvvfVIVT1JRU6C6jEl/Hp/h6AUOHfL3NxbZmdn55cmyREksGsCNABcIakS8H1/BCKfBbA81cD5D5a8mnUxRC72gEvCMPxZ/ktKr4IgCJ4cAydA9YUAkj97pxe9EJG2QPX0KIqS8zl4kUAqBGgAUsHIIA8lMD4+flgzjr8E4Mkks1MCyTHFl4vq5SLyHwMDA1fX6/UtZeBVq9WWLywsJL/hP0dFnru4r0RRjt3tRQtvrHje8NTU1LW9CM6Y5SVAA1De3ve08uRDvtFonKvAaE8TFSd4U4EbRPUqAD8G8JM4jq/J+6Yuo6Oje3uedziApwN4hoocJduP2q0Up3W9q0SAmWq1ekZZzGHvSDLyjgjQAHBd9JSAMSZ5N3sdgJU9TVTc4LcDuAHAzwRIbhvcrKo3e573K1deP9z2Ol4cP05Ekvfvn6Dbv/lJ/iQ/6Pcrbmt6WtkmAdZaa6d7moXBS02ABqDU7e9P8WNjYweL530ewNH9yViaLPcA+B8AyVbFt0H1DhG5A8Bdqnq3iNwNYJOqborjOLm9cP9uu+12H4BGvV5Pdjh8YFdDqdVqAwCqzWZzt0ajsbvnectFJDFtK1V1LxHZK7kvr6r7QmTfxdc+k1c//wjAnqUh3p9Cr9Q4fv309PRN/UnHLGUlQANQ1s73ue6JiYmBjRs3vntx90B+/dtn/kznPoFk22kP+NCqVavePzk5mRg0XiTQUwI0AD3Fy+APJ+D7/rMgMgPgENIhARJ4kMCNUB2NougHZEIC/SJAA9Av0szzIAHf93cTkQ8o8Fa+382FUXICsQCfVNV3RVF0f8lZsPw+E6AB6DNwpvtfAqNBcExFdUq3PyzGiwRKRUCAG5oi4zNh+P1SFc5inSFAA+BMK8opJNlBcGho6J0KvAPAYDkpsOqSEZgX4MNzc3Mf5I5+Jeu8Y+XSADjWkLLK8X3/EIjUATyvrAxYdykIXAbVWhRFN5aiWhbpNAEaAKfbUzpx4gfBGFQ/AoA7w5Wu/YUuONn58e1RGCbv9T/w+mWhC2Zx7hOgAXC/R6VT6Pv+nvC890H1jdwxrnTtL1rByaFQ5yCO3xNFUbJvAy8ScIYADYAzraCQhxMYHR19mlepfBrA8aRDAjkkcGncbL55ZmbmpznUTsklIEADUIIm571EY8wrFfgogCflvRbqLwWBXwjwV9bar5WiWhaZWwI0ALltXbmE12q1aqPROE2B9/D5gHL1PkfV3inA+6rV6nn1er2RI92UWlICNAAlbXxey04OnlHVs2LgbQIM5bUO6i4OAQXmPOATIvIxVw5oKg5dVtJLAjQAvaTL2D0jYIzZR0Xesfig4G49S8TAJLBzAvcnD/iJ6oettXcSFAnkjQANQN46Rr1/QODUWu2x1UbjHQq8AcDuxEMCfSBwnwCfa1SrH76gXv91H/IxBQn0hAANQE+wMmi/CaxZs2a/hYWFv4RI8urgin7nZ75SENgM1XMGBgY+fv75599eiopZZKEJ0AAUur3lK250dHRvz/POhMja5Pz68hFgxT0gcBdU18VxfPbMzMxdPYjPkCSQCQEagEywM2mvCYyMjKwYGBgwCrwFwMG9zsf4hSRwkwCfWlhYsOvXr99cyApZVKkJ0ACUuv3FL35iYsLbuHHjywG8WYETil8xK+yWgACXAPj0qlWrvj45ORl3G4/zScBVAjQArnaGulInMD4+flhT9QxVHeUrhKnjzXXA5FU+EZmpiJw7NTV1ba6LoXgSaJEADUCLoDisOAQW9xJYDSDZWOiI4lTGStolIMCPAJwnIhv4Dn+79Dg+7wRoAPLeQervioAx5khVDSDyegB7dhWMk/NC4B6ofl5EQmvt1XkRTZ0kkDYBGoC0iTJeLgmsXbt22dzc3MsVOBXAnwCo5rIQit4ZgWRr3n8V4IKhoaGvr1u3bitRkUDZCdAAlH0FsP5HEFi9evVeg4ODr1GR18r2BwcrxJRLAk0FLhHVL87Pz39pw4YNd+eyCoomgR4RoAHoEViGLQaBZMvhGDhFgFcBeCG/GXC+r8lv+hcr8BUP+Cq36HW+XxSYIQEagAzhM3W+CNRqtUfNz8+/DCIvh8jLoLpXviooqFqRu6H6Dah+fXBw8Bv1ev33Ba2UZZFAqgRoAFLFyWBlITA8PFxZvnz5c0TkpSryMgGOBOCVpf6M64wVuFpUv6Gq39qyZct/zM7ONjPWxPQkkDsCNAC5axkFu0hgfHz80QuqJ0gcnwCR5LmBpwDgv690mqUAboDqJep5lwyIXDI1NfW7dEIzCgmUlwA/oMrbe1beQwIjIyP7ViqV40TkWADH6vZvCJb1MGWRQm8VIHk97wpVvUJELuO9/CK1l7W4QoAGwJVOUEehCQwPDw/uvscez/CazaNU5KjFWwZP5UOFSB7au37xK/2r4krlqvvuvffHs7Oz84VeECyOBBwgQAPgQBMooZwEarVadX5+/lAROQzA4ap6KEQOAfC4Ar56mNyj/xVUbxSR6wBco6rXDg4OXlev1xMTwIsESKDPBGgA+gyc6UhgKQK+7++mqgd7nvdEAE9I/h8iqyByEIADnX37IHkaH7gVqrdAdaOI3ATg5jiO/yv5/yiK7l+qdv49CZBA/wjQAPSPNTORQCoEhoeHd1++fPkBlUrlsQvAPhXVfQHso6p7i8ijVWQPqO6hwB6Lhx4tB7AbgMHkvwoMyPY3Fh54ayF5qj4WYAFA8kM6+fo9+e+WbYfkAPdC5F5RvVdVfycidwG4sylyx0Dy32bz11u2bLltdnb2vlQKZBASIIG+EKAB6AtmJiEBEiABEiABtwjQALjVD6ohARIgARIggb4QoAHoC2YmIQESIAESIAG3CNAAuNUPqiEBEiABEiCBvhCgAegLZiYhARIgARIgAbcI0AC41Q+qIQESIAESIIG+EKAB6AtmJiEBEiABEiABtwjQALjVD6ohARIgARIggb4QoAHoC2YmIQESIAESIAG3CNAAuNUPqiEBEiABEiCBvhCgAegLZiYhARIgARIgAbcI0AC41Q+qIQESIAESIIG+EKAB6AtmJiEBEiABEiABtwjQALjVD6ohARIgARIggb4QoAHoC2YmIQESIAESIAG3CNAAuNUPqiEBEiABEiCBvhCgAegLZiYhARIgARIgAbcI0AC41Q+qIQESIAESIIG+EKAB6AtmJiEBEiABEiABtwjQALjVD6ohARIgARIggb4QoAHoC2YmIQESIAESIAG3CNAAuNUPqiEBEiABEiCBvhCgAegLZiYhARIgARIgAbcI0AC41Q+qIQESIAESIIG+EKAB6AtmJiEBEiABEiABtwjQALjVD6ohARIgARIggb4QoAHoC2YmIQESIAESIAG3CNAAuNUPqiEBEiABEiCBvhCgAegLZiYhARIgARIgAbcI0AC41Q+qIQESIAESIIG+EKAB6AtmJiEBEiABEiABtwjQALjVD6ohARIgARIggb4Q+P/t1jENAAAAwjD/rnGxcFQBpDw4AAmzEAIECBAg8CXgAHztoQ0BAgQIEEgEHICEWQgBAgQIEPgScAC+9tCGAAECBAgkAg5AwiyEAAECBAh8CTgAX3toQ4AAAQIEEgEHIGEWQoAAAQIEvgQcgK89tCFAgAABAomAA5AwCyFAgAABAl8CDsDXHtoQIECAAIFEwAFImIUQIECAAIEvAQfgaw9tCBAgQIBAIuAAJMxCCBAgQIDAl4AD8LWHNgQIECBAIBFwABJmIQQIECBA4EvAAfjaQxsCBAgQIJAIOAAJsxACBAgQIPAl4AB87aENAQIECBBIBByAhFkIAQIECBD4EnAAvvbQhgABAgQIJAIOQMIshAABAgQIfAk4AF97aEOAAAECBBIBByBhFkKAAAECBL4EHICvPbQhQIAAAQKJgAOQMAshQIAAAQJfAg7A1x7aECBAgACBRMABSJiFECBAgACBLwEH4GsPbQgQIECAQCLgACTMQggQIECAwJeAA/C1hzYECBAgQCARcAASZiEECBAgQOBLwAH42kMbAgQIECCQCDgACbMQAgQIECDwJeAAfO2hDQECBAgQSAQcgIRZCAECBAgQ+BJwAL720IYAAQIECCQCDkDCLIQAAQIECHwJOABfe2hDgAABAgQSAQcgYRZCgAABAgS+BByArz20IUCAAAECiYADkDALIUCAAAECXwIOwNce2hAgQIAAgUTAAUiYhRAgQIAAgS8BB+BrD20IECBAgEAi4AAkzEIIECBAgMCXgAPwtYc2BAgQIEAgEXAAEmYhBAgQIEDgS8AB+NpDGwIECBAgkAgM4b1LWha3y58AAAAASUVORK5CYII=',
    calendarIcon: 'data:image/png;base64,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'
};