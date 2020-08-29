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
                    
                    // aqui
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
    $('.ghx-parent-key').text(function(i, text) {
        return ("000" + text.replace(/QUAL-(\d{2,5})/g, '$1')).substr(-4);
    });

    $('.ghx-description').text(function(i, text) {
        return text.replace(/sub-task/g, 'task');
    });

    $('.ghx-heading').css('margin-top', '2px');
    $('.ghx-heading').css('margin-bottom', '2px');

    $('.jira-issue-status-lozenge').text(function(i, text) {
        return text.replace(/DEVELOPED/gi, 'TO BE TESTED');
    });

    $('.jira-issue-status-lozenge').text(function(i, text) {
        return text.replace(/In qa/gi, 'In Testing');
    });

    $('.jira-issue-status-lozenge').text(function(i, text) {
        return text.replace(/Product backlog/gi, 'To detail');
    });

    $('.jira-issue-status-lozenge').text(function(i, text) {
        return text.replace(/ready for development/gi, 'Ready to code');
    });
}

$(document).ready(function(){
    insertBurnDownDOM();
    setTimeout(optimizeUI, 2000);
});