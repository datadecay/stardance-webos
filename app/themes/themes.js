window.readApp = {
    selectedBookId: "book1-content",

    openBook: function (bookId) {
       const oldPage = document.getElementById(window.readApp.selectedBookId);
        if (oldPage) oldPage.style.display = "none";

        const newPage = document.getElementById(bookId);
        if (newPage) newPage.style.display = "block";

        window.guideApp.selectedBookId = bookId;
    }
}