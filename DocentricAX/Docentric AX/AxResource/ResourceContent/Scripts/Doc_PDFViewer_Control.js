(function () {
    "use strict";

    $dyn.controls.Doc_PDFViewer_Control = function (data, element) {
        var control = this;
        $dyn.ui.Control.apply(this, arguments);
        $dyn.ui.applyDefaults(this, data, $dyn.ui.defaults.Doc_PDFViewer_Control);

        // Create and run the viewer controller.
        var controller = controllerInitializer(control, data, element);
        controller.downloadAndDisplayDocument();

    }

    $dyn.controls.Doc_PDFViewer_Control.prototype = $dyn.extendPrototype($dyn.ui.Control.prototype, {
        init: function (data, element) {
            var self = this;
            $dyn.ui.Control.prototype.init.apply(this, arguments);

            // ***************************************************************
            // *** REPAIRING PROBLEM WITH LAYOUT OF DOCENTRIC DOCUMENT VIEWER
            // ***************************************************************
            // 1. Remember current style options of the form
            var formCaptionOriginalDisplayState = $(".formCaptionContainer").css("display");
            var parentControlOriginalPosition = $(".formContainer>div>.rootContent").css("position");
            // 2. Register current form onClose event handler to set the styles to the original state
            this.Root.onClose.subscribe(function () {
                $(".formCaptionContainer").css("display", formCaptionOriginalDisplayState);
                $(".formContainer>div>.rootContent").css("position", parentControlOriginalPosition);
            });
            // 3. Fixing layout on older versions of D365FO < 10.0.10
            $(".formCaptionContainer").css("display", "none");
            $(".formContainer>div>.rootContent").css("position", "relative");
        }
    });

    // This function creates and initializes the controller for this viewer control instance
    var controllerInitializer = function (control, data, element) {
        var useBrowserViewer = $dyn.value(data.UseBrowserViewer);
        var fileName = $dyn.value(data.FileName);
        var userLanguage = $dyn.value(data.UserLanguage);
        var enableExportToWord = $dyn.value(data.EnableExportToWord);
        var enableExportToExcel = $dyn.value(data.EnableExportToExcel);
        // enables native PDF printing (vector printing) directly from browser
        // this disables the default PDF.JS printing via canvas as image
        var enablePrintFromBrowser = $dyn.value(data.EnableNativePdfPrinting);

        // defining the array of hadles for all the process messages to be shown (progress bar)
        var processMessageTimeoutHandleArray = [];

        var iFrameElement = $(element).find("iframe")[0];

        // Create new controller object.
        var controller = {};


        // downloadAndDisplayDocument
        controller.downloadAndDisplayDocument = function () {
            var documentBase64Strings = [];

            // Get the first document chunk.
            getNextChunk();


            // getNextChunk
            function getNextChunk() {
                setTimeout(function () { $dyn.callFunction(control.GetNextChunk, control, {}, getNextChunkComplete); }, 1);
            }


            // getNextChunkComplete
            function getNextChunkComplete(retrievedDocumentChunk) {
                if (retrievedDocumentChunk != null && retrievedDocumentChunk.length > 0) {
                    documentBase64Strings.push(retrievedDocumentChunk);
                    //console.log(documentBase64String.length);
                    getNextChunk();
                }
                else {
                    //console.log('done!');
                    initializeViewerIFrame(documentBase64Strings);
                }
            }
        }


        // initializeViewerIFrame
        function initializeViewerIFrame(documentBase64Strings) {

            // Extract FileContent Base64 string and convert it to byte array.
            var fileBytes = b64toArray(documentBase64Strings);

            // Make download link.
            var file = createFile(fileBytes, fileName)
            var fileUrl = URL.createObjectURL(file);

            // Add progress event listner
            addProgressEventListner();

            // Add listener for the DownloadWord and DownloadExcel buttons inside IFRAME.
            addDownloadWordListener(fileUrl);
            addDownloadExcelListener(fileUrl);

            // Show viewer with the document in the IFRAME.
            if (useBrowserViewer)
                iFrameElement.src = fileUrl;
            else
                iFrameElement.src = "Resources/Html/Doc_PDFViewer.htm?file=" + fileUrl +
                    "&locale=" + userLanguage +
                    "&fileName=" + encodeURI(fileName) +
                    "&enableExportToWord=" + enableExportToWord +
                    "&enableExportToExcel=" + enableExportToExcel +
                    "&enablePrintFromBrowser=" + enablePrintFromBrowser;
        }


        // createFile
        function createFile(fileData, fileName) {
            var properties = { type: 'application/pdf' }; // Specify the file's mime-type.

            var file;
            try {
                // Specify the filename using the File constructor, but ...
                file = new File(fileData, fileName, properties);
            } catch (e) {
                // ... fall back to the Blob constructor if that isn't supported.
                file = new Blob(fileData, properties);
            }

            return file;
        }


        // b64toArray
        function b64toArray(base64Strings) {
            var byteArrays = [];
            for (var bc = 0; bc < base64Strings.length; bc++) {
                var byteArray = Base64Binary.decode(base64Strings[bc]);
                byteArrays.push(byteArray);
            }
            return byteArrays;
        }


        // Base64String -> Byte Array
        var Base64Binary = {
            _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

            /* will return a  Uint8Array type */
            decodeArrayBuffer: function (input) {
                var bytes = (input.length / 4) * 3;
                var ab = new ArrayBuffer(bytes);
                this.decode(input, ab);

                return ab;
            },

            removePaddingChars: function (input) {
                var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
                if (lkey == 64) {
                    return input.substring(0, input.length - 1);
                }
                return input;
            },

            decode: function (input, arrayBuffer) {
                //get last chars to see if are valid
                input = this.removePaddingChars(input);
                input = this.removePaddingChars(input);

                var bytes = parseInt((input.length / 4) * 3, 10);

                var uarray;
                var chr1, chr2, chr3;
                var enc1, enc2, enc3, enc4;
                var i = 0;
                var j = 0;

                if (arrayBuffer)
                    uarray = new Uint8Array(arrayBuffer);
                else
                    uarray = new Uint8Array(bytes);

                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

                for (i = 0; i < bytes; i += 3) {
                    //get the 3 octects in 4 ascii chars
                    enc1 = this._keyStr.indexOf(input.charAt(j++));
                    enc2 = this._keyStr.indexOf(input.charAt(j++));
                    enc3 = this._keyStr.indexOf(input.charAt(j++));
                    enc4 = this._keyStr.indexOf(input.charAt(j++));

                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;

                    uarray[i] = chr1;
                    if (enc3 != 64) uarray[i + 1] = chr2;
                    if (enc4 != 64) uarray[i + 2] = chr3;
                }

                return uarray;
            }
        }

        /**
         * Show or Hide the standard D365FO processing message
         */
        function showHideProcessingMessage(showProcessingMessage) {
            let displayStyle = "none";
            if (showProcessingMessage == true) {
                displayStyle = "inline";
            }

            let progressFunction = (innerDisplayStyle) => {
                // show or hide processing message div
                if ($dyn.shell.blockingDiv != undefined && $dyn.shell.blockingDiv != null) {
                    $dyn.shell.blockingDiv.style.display = innerDisplayStyle;
                }
                if ($dyn.shell._shellProcessingDiv != undefined && $dyn.shell._shellProcessingDiv != null) {
                    $dyn.shell._shellProcessingDiv.style.display = innerDisplayStyle;
                }
            }

            if (showProcessingMessage == true) {
                // we need to show the progress delayed
                // keep in mind that this function can be called several times
                const delayInMiliseconds = 500;
                const timeoutHandle = setTimeout(progressFunction(displayStyle), delayInMiliseconds);
                processMessageTimeoutHandleArray.push(timeoutHandle);
            } else {
                // clearing the previous delayed progress message (cancel them)
                let timeoutHandle = undefined;
                while ((timeoutHandle = processMessageTimeoutHandleArray.pop()) != undefined) {
                    clearTimeout(timeoutHandle);
                }
                progressFunction(displayStyle);
            }
        }

        /**
         * Registers event to show or hide the standard D365FO progress
         */
        function addProgressEventListner() {
            window.addEventListener("message", function (e) {
                if (e.data == "Doc_PDFViewer_ProcessingMessage_show") {
                    showHideProcessingMessage(true);
                } else if (e.data == "Doc_PDFViewer_ProcessingMessage_hide") {
                    showHideProcessingMessage(false);
                }
            });
        }

        /**
         * Executes the download of the generated report in Microsoft Word format.
         * @param  {object} event The event
         */
        function exportToWord(event) {
            showHideProcessingMessage(true);
            try {
                $dyn.callFunction(control.ExportToWord, control, {}, exportToWordComplete);
            } catch (reason) {
                // diplaying the error in console
                if (console !== undefined) {
                    console.error(`Error when exporting the document to Word (reason: ${reason.message}).`);
                }

                showHideProcessingMessage(false);
            }
        };

        /**
         * Executes the download of the generated report in Microsoft Word format is completed.
         * @param  {object} event The event
         */
        function exportToWordComplete(event) {
            showHideProcessingMessage(false);
        }

        /**
         * Registers the event listner to execute the download of the generated report in Microsoft Word format.
         * @param  {string} fileUrl Full file URL
         */
        function addDownloadWordListener(fileUrl) {
            window.addEventListener("message", function (e) {
                if (e.data == "DownloadWord" + fileUrl) {
                    exportToWord();
                }
            });
        }

        /**
         * Executes the download of the generated report in Microsoft Excel format.
         * @param  {object} event The event
         */
        function exportToExcel(event) {
            showHideProcessingMessage(true);
            try {
                $dyn.callFunction(control.ExportToExcel, control, {}, exportToExcelComplete);
            } catch (reason) {
                showHideProcessingMessage(false);

                // diplaying the error in console
                if (console !== undefined) {
                    console.error(`Error when exporting the document to Excel (reason: ${reason.message}).`);
                }
            }
        };

        /**
         * Executes the download of the generated report in Microsoft Excel format is completed.
         * @param  {object} event The event
         */
        function exportToExcelComplete(event) {
            showHideProcessingMessage(false);
        }


        /**
         * Registers the event listner to execute the download of the generated report in Microsoft Excel format.
         * @param  {string} fileUrl Full file URL
         */
        function addDownloadExcelListener(fileUrl) {
            window.addEventListener("message", function (e) {
                if (e.data == "DownloadExcel" + fileUrl) {
                    exportToExcel();
                }
            });
        }

        // Return.
        return controller;
    }
})();