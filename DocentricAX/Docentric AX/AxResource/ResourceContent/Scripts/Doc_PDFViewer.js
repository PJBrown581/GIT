(function () {
    "use strict";

    var documentTitleSet = false;
    var file = getQueryStringParameter("file");
    var filename = getQueryStringParameter("fileName");
    var locale = getQueryStringParameter("locale");
    var enableExportToWord = getQueryStringParameter("enableExportToWord");
    var enableExportToExcel = getQueryStringParameter("enableExportToExcel");
    // enables vector printing PDF directly from browser
    // this disables the default PDF.JS printing via canvas as image
    var enablePrintFromBrowser = getQueryStringParameter("enablePrintFromBrowser");
    // if printing is not supported by this browser we need to switch back to the PDF.JS way, 
    // even if it's requested to print the PDF directly
    if (isPrintInBrowserSupported() == false) {
        enablePrintFromBrowser = "false";
    }
    // tells if the PDF loaded is encrypted and is needed for other functionality (e.g., printing from browser)
    var isEncryptedPdfLoaded = false;

    // we need to set the right user language - First try (it depends how PDF viewer is called)
    setViewerLanguage();

    if (document.readyState === "interactive" || document.readyState === "complete") {
        webViewerInitialize();
    } else {
        document.addEventListener("DOMContentLoaded", webViewerInitialize, true);
        document.addEventListener("webviewerloaded", function () {
            // we need to set the right user language
            setViewerLanguage();
        }, true);
    }

    function setViewerLanguage() {
        // we need to set the right user language
        if (!((locale !== null) && (typeof locale === "string") && (locale.length > 0)))
            locale = "en"; // fallback language

        if ((PDFViewerApplicationOptions !== undefined) && (PDFViewerApplicationOptions !== null)) {
            PDFViewerApplicationOptions.set("locale", locale);
        }
    }

    function webViewerInitialize() {
        // changing PDF.js defaults
        // we need to set the right user language - Second try (it depends how PDF viewer is called)
        setViewerLanguage();

        // we need to change the default print resolution from 150 to 200 DPI to get better results when printing the file
        PDFViewerApplicationOptions.set("printResolution", 200);

        // Wait for the PDFViewerApplication to initialize
        PDFViewerApplication.initializedPromise.then(function () {
            // register on page rendered event
            PDFViewerApplication.eventBus.on('pagerendered', function (event) {
                // get the filename from URI querystring parameters
                // this is important for download to use the right filename
                // we should do this only one (stop processing after first page)
                if (documentTitleSet === false) {
                    PDFViewerApplication.setTitleUsingUrl(filename, file);
                    // prevent from being set again
                    documentTitleSet = true;
                }
            });
        });

        // hide all not needed buttons
        let openFileButton = document.getElementById("openFile");
        openFileButton.style = "display:none;";
        let printButton = document.getElementById("print");
        if (enablePrintFromBrowser == "true") {
            printButton.style = "display:none;";
        }

        let downloadFileButton = document.getElementById("download");
        downloadFileButton.style = "display:none;";
        let bookmarkButton = document.getElementById("viewBookmark");
        bookmarkButton.style = "display:none;";
        let editorModeButtons = document.getElementById("editorModeButtons");
        editorModeButtons.style = "display:none;"
        let editorModeSeparator = document.getElementById("editorModeSeparator");
        editorModeSeparator.style = "display:none;"


        let secondaryOpenFileButton = document.getElementById("secondaryOpenFile");
        secondaryOpenFileButton.style = "display:none;";
        let secondaryPrintButton = document.getElementById("secondaryPrint");
        if (enablePrintFromBrowser == "true") {
            secondaryPrintButton.style = "display:none;";
        }
        let secondaryDownloadButton = document.getElementById("secondaryDownload");
        secondaryDownloadButton.style = "display:none;";
        let secondaryViewBookmarkButton = document.getElementById("secondaryViewBookmark");
        if (secondaryViewBookmarkButton != null) {
            secondaryViewBookmarkButton.style = "display:none;"
        }

        // create new buttons
        if (enablePrintFromBrowser == "true") {
            let printFromBrowserButton = document.createElement("button");
            printFromBrowserButton.id = printButton.id;
            // we need to change the existing id because icons are attached to id and we later can resolve the button
            printButton.id = printButton.id + "_old";
            printFromBrowserButton.title = "Print";
            printFromBrowserButton.tabIndex = printButton.tabIndex;
            printFromBrowserButton.className = "toolbarButton";
            printFromBrowserButton.setAttribute("data-l10n-id", "print");
            printFromBrowserButton.innerHTML = "<span data-l10n-id=\"print_label\">Print</span>";

            // append the new download menu to the toolbar
            appendElementAfter(printFromBrowserButton, printButton);

            // register print button listner
            printFromBrowserButton.addEventListener("click", function (event) {
                try {
                    // we need to check if the loaded PDF is encrypted
                    PDFViewerApplication.pdfDocument.getMetadata().then((metadata) => {
                        isEncryptedPdfLoaded = metadata?.info?.EncryptFilterName?.length > 0;

                        // now we actually do the print
                        invokePrintFromBrowser();
                    });
                } catch (reason) {
                    if (console !== undefined) {
                        console.warn('There was an issue checking if PDF is encrypted (reason: ${reason.message}).');
                    }

                    // fallback to the old printing
                    invokePrintWithPdfJs();
                }
            });
        }
        let downloadMenuButton = document.createElement("button");
        downloadMenuButton.id = downloadFileButton.id;
        // we need to change the existing id because icons are attached to id and we later can resolve the button
        downloadFileButton.id = downloadFileButton.id + "_old";
        downloadMenuButton.title = "Download";
        downloadMenuButton.tabIndex = downloadFileButton.tabIndex;
        downloadMenuButton.className = "toolbarButton";
        downloadMenuButton.setAttribute("data-l10n-id", "download_button");
        downloadMenuButton.setAttribute("aria-expanded", "false");
        downloadMenuButton.setAttribute("aria-controls", "secondaryToolbar");
        let downloadMenuButtonInnerSpan = document.createElement("span");
        downloadMenuButtonInnerSpan.setAttribute("data-l10n-id", "download_button_label");
        downloadMenuButtonInnerSpan.textContent = "Download";
        downloadMenuButton.appendChild(downloadMenuButtonInnerSpan);

        // append the new download menu to the toolbar
        appendElementAfter(downloadMenuButton, downloadFileButton);

        // create the download menu items container
        let downloadMenuContainer = document.createElement("div");
        downloadMenuContainer.style = "position: relative;";
        
        // create the download menu items buttons
        let downloadMenuInnerHtml = '';
        downloadMenuInnerHtml += '<div id="downloadMenuContainer" class="secondaryToolbar hidden doorHangerRight" style="width: 90px;">\n';
        downloadMenuInnerHtml += '  <button id="downloadAsPdf" class="secondaryToolbarButton downloadPdf" title="PDF">\n';
        downloadMenuInnerHtml += '      <span>PDF</span>\n';
        downloadMenuInnerHtml += '  </button>\n';
        downloadMenuInnerHtml += '  <button id="downloadAsWord" class="secondaryToolbarButton downloadWord" title="Word"' + (enableExportToWord == 'true' ? '' : ' disabled') + '>\n';
        downloadMenuInnerHtml += '      <span>Word</span>\n';
        downloadMenuInnerHtml += '  </button>\n';
        downloadMenuInnerHtml += '  <button id="downloadAsExcel" class="secondaryToolbarButton downloadExcel" title="Excel"' + (enableExportToExcel == 'true' ? '' : 'disabled') + '>\n';
        downloadMenuInnerHtml += '      <span>Excel</span>\n';
        downloadMenuInnerHtml += '  </button>\n';
        downloadMenuInnerHtml += '</div>\n';

        // add the buttons to menu item container
        downloadMenuContainer.innerHTML = downloadMenuInnerHtml;

        // add the menu items container to the DOM
        appendElementAfter(downloadMenuContainer, downloadMenuButton);

        // add the download menu toggle functionality
        downloadMenuButton.addEventListener("click", toogleDownloadMenu);

        document.addEventListener("mouseup", function (event) {
            let downloadMenuContainer = document.getElementById("downloadMenuContainer");
            // if it's closed, we do nothing
            if ((downloadMenuContainer.opened === undefined) || (downloadMenuContainer.opened === false))
                return;

            // then we check if the click was done outside the menu item
            var tmpElement = event.target;
            while (tmpElement != null) {
                if (tmpElement == downloadMenuContainer) {
                    return;
                }
                tmpElement = tmpElement.parentElement;
            }

            // let toogle the download menu
            toogleDownloadMenu();
        });

        document.addEventListener("keydown", function (event) {
            if (event.which == 27) {
                // if it's closed, we do nothing
                let downloadMenuContainer = document.getElementById("downloadMenuContainer");
                if ((downloadMenuContainer.opened === undefined) || (downloadMenuContainer.opened === false))
                    return;

                // let toogle the download menu
                toogleDownloadMenu();
            }
        });
    
        // register download button listners
        document.getElementById("downloadAsPdf").addEventListener("click", invokeDownloadAsPdf);
        document.getElementById("downloadAsWord").addEventListener("click", invokeDownloadAsWord);
        document.getElementById("downloadAsExcel").addEventListener("click", invokeDownloadAsExcel);

        // fix the document properties dialog filename
        let fileNameField = document.getElementById("fileNameField");
        fileNameField.style = "display:none;";
        let newFileNameField = document.createElement("p");
        newFileNameField.id = "docFileNameField";
        newFileNameField.textContent = filename;
        appendElementBefore(newFileNameField, fileNameField);
    }

    /**
     * Append the sourceElement before the existing targetElement.
     * @param {Node} sourceElement   The source element to be added to DOM.
     * @param {Node} targetElement   The existing target element in the DOM.
     */
    function appendElementBefore(sourceElement, targetElement) {
        targetElement.parentNode.insertBefore(sourceElement, targetElement);
    }

    /**
     * Append the sourceElement after the existing targetElement.
     * @param {Node} sourceElement   The source element to be added to DOM.
     * @param {Node} targetElement   The existing target element in the DOM.
     */
    function appendElementAfter(sourceElement, targetElement) {
        targetElement.parentNode.insertBefore(sourceElement, targetElement.nextSibling);
    }

    /**
     * Get the query string parameter value.
     * @param {String} parameterName    The query string parameter
     * @returns {String}                The value of the query string parameter, otherwise null
     */
    function getQueryStringParameter(parameterName) {
        if (URLSearchParams === undefined) {
            return (window.location.search.match(new RegExp('[?&]' + parameterName + '=([^&]+)')) || [, null])[1];
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(parameterName);
        }
    }

    /**
     * Toogle download menu item. If it's open it will close it or vice versa.
     * */
    function toogleDownloadMenu() {
        let downloadMenuButton = document.getElementById("download");
        let downloadMenuContainer = document.getElementById("downloadMenuContainer");

        if (downloadMenuContainer.opened === true) {
            downloadMenuContainer.opened = false;
            downloadMenuButton.classList.remove("toggled");
            downloadMenuButton.setAttribute("aria-expanded", "false");
            downloadMenuContainer.classList.add("hidden");
        } else {
            downloadMenuContainer.opened = true;
            downloadMenuButton.classList.add("toggled");
            downloadMenuButton.setAttribute("aria-expanded", "true");
            downloadMenuContainer.classList.remove("hidden");
        }
    }

    /** 
     *  Invoke the action "Download as Pdf" for the requsted file.
     */
    function invokeDownloadAsPdf() {
        PDFViewerApplication.downloadOrSave();
        toogleDownloadMenu();
    }

    /** 
     *  Invoke the action "Download as Word" for the requsted file.
     */
    function invokeDownloadAsWord() {
        var file = getQueryStringParameter("file");
        parent.postMessage('DownloadWord' + file, '*');
        toogleDownloadMenu();
    }

    /**
     *  Invoke the action "Download as Excel" for the requsted file.
     */
    function invokeDownloadAsExcel() {
        var file = getQueryStringParameter("file");
        parent.postMessage('DownloadExcel' + file, '*');
        toogleDownloadMenu();
    }

    /**
     * Send a massage to show the processing message (standard progress bar).
     */
    function showProcessingMessage() {
        parent.postMessage('Doc_PDFViewer_ProcessingMessage_show');
    }

    /**
     * Send a massage to hide the processing message (standard progress bar).
     */
    function hideProcessingMessage() {
        parent.postMessage('Doc_PDFViewer_ProcessingMessage_hide');
    }

    /**
     * Invoke the action "Print for Browser" for the requested PDF file.
     */
    function invokePrintFromBrowser() {
        const modalPrintMessage = "Please wait. We are preparing the document for printing...";
        const showModalDialog = false;
        const fileType = "pdf";
      
        // if we have the encrypted PDF file loaded we need to fallback to the old printing
        if (isEncryptedPdfLoaded == true) {
            invokePrintWithPdfJs();
        }

        try {
            showProcessingMessage();

            // Save the current opened PDF from PDFJS to start printing in the browser
            PDFViewerApplication.pdfDocument.saveDocument().then((data) => {
                try {
                    // then we convert it to blob
                    const blob = new Blob([data], { type: "application/pdf" });

                    // now we need to read the blob
                    let reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = function () {
                        try {
                            // get the PDF base64
                            let fileBase64data = reader.result;
                            // remove the initial part(we only the the bare content)
                            fileBase64data = fileBase64data.substring(fileBase64data.indexOf(',') + 1);
                            // print the base64 as PDF in modern browser
                            printJS({ printable: fileBase64data, base64: true, type: fileType, modalMessage: modalPrintMessage, showModal: showModalDialog });

                            hideProcessingMessage();
                        } catch (reason) {
                            hideProcessingMessage();

                            // if anything goes wrong we fallback to the old printing
                            invokePrintWithPdfJs();

                            // diplaying the error in console
                            if (console !== undefined) {
                                console.error(`Error when printing the document (reason: ${reason.message}).`);
                            }
                        }
                    }
                } catch (reason) {
                    hideProcessingMessage();

                    // if anything goes wrong we fallback to the old printing
                    invokePrintWithPdfJs();

                    // diplaying the error in console
                    if (console !== undefined) {
                        console.error(`Error when printing the document (reason: ${reason.message}).`);
                    }
                }
            });
        } catch (reason) {
            hideProcessingMessage();

            // if anything goes wrong we fallback to the old printing
            invokePrintWithPdfJs();

            // diplaying the error in console
            if (console !== undefined) {
                console.error(`Error when printing the document (reason: ${reason.message}).`);
            }
        }
    }

    /**
     * Invoke the action to print the PDF file in a standard PDF.JS way.
     */
    function invokePrintWithPdfJs() {
        let printButton = document.getElementById("print_old");
        // we don't have new way printing, that is why we try to find the original control
        if (printButton == undefined) {
            printButton = document.getElementById("print");
        }
        printButton?.click();
    }

    /**
     * Check if printing in browser is supported by this browser.
     */
    function isPrintInBrowserSupported() {
        const userAgent = navigator.userAgent;

        if (userAgent.includes('Chrome')) {
            // Google Chrome
            return true;
        } else if (userAgent.includes('Firefox')) {
            // Mozilla Firefox
            return false;
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            // Safari
            return true;
        } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
            // Internet Explorer
            return false;
        } else if (userAgent.includes('Edg')) {
            // Microsoft Edge
            return true;
        } else {
            // Other or unknown
            return false;
        }
    }
})();