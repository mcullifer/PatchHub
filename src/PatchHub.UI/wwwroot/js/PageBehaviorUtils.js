﻿function OnScrollEvent(elementId) {
    var component = document.getElementById(elementId);
    if (component != null) {
        component.scrollTop = 0;
    }
}

function GetViewPortHeight() {
    var height = window.innerHeight;
    return height + "";
}