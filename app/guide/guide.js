window.guideApp = {
    selectedGuideId: "guide1-content",

    openGuide: function(guideId) {
        const oldPage = document.getElementById(window.guideApp.selectedGuideId);
        if (oldPage) oldPage.style.display = "none";

        const newPage = document.getElementById(guideId);
        if (newPage) newPage.style.display = "block";

        window.guideApp.selectedGuideId = guideId;
    }
};