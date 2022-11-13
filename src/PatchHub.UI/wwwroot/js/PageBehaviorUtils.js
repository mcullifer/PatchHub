function OnScrollEvent(elementId) {
    var component = document.getElementById(elementId);
    if (component != null) {
        component.scrollTop = 0;
    }
}

function GetViewPortHeight() {
    var height = window.innerHeight;
    return height + "";
}

function GetViewPortWidth() {
    var width = window.innerWidth;
    return width + "";
}

function GetDistanceToBottom(elementId) {
    var component = document.getElementById(elementId);
    var height = window.innerHeight - component.offsetTop;
    return height;
}