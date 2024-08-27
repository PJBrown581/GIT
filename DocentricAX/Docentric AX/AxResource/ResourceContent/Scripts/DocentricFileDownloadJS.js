(function () {
    "use strict";


    $dyn.controls.DocentricFileDownloadHTM = function (data, element) {
        var control = this;

        $dyn.ui.Control.apply(control, arguments);


        // Create and run the download controller.
        var controller = controllerInitializer(control, data, element);
        controller.initiateDownload();
    };



    $dyn.controls.DocentricFileDownloadHTM.prototype = $dyn.extendPrototype($dyn.ui.Control.prototype, {
        init: function (data, element) {
            var self = this;
            $dyn.ui.Control.prototype.init.apply(this, arguments);
        }
    });



    // This function creates and initializes the controller for this download control instance
    var controllerInitializer = function (control, data, element) {
        var aElement = $(element).find("a")[0];
        var fileName = $dyn.value(data.FileName);
        var fileContentBase64 = $dyn.value(data.FileContent);


        // Create new controller object.
        var controller = {};


        // initiateDownload
        controller.initiateDownload = function () {
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
                    onAllChunksRetrieved(documentBase64Strings);
                }
            }
        }


        // onAllChunksRetrieved
        function onAllChunksRetrieved(documentBase64Strings) {

            // Extract FileContent Base64 string and convert it to byte array.
            var fileBytes = b64toArray(documentBase64Strings);

            // Make download link.
            var file = createFile(fileBytes, fileName)
            var fileUrl = URL.createObjectURL(file);

            // Make download link.
            var url = URL.createObjectURL(file);

            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(file, fileName);
            }
            else {
                // Initiate the download by programmatically click the link.
                aElement.download = fileName;
                aElement.href = url;
                aElement.click();
            }

            // Signal the download completion and close the form.
            onDownloadComplete();
        }


        function onDownloadComplete() {
            // WORKAROUND: We must defer the call to the X++ method otherwise we get a "... command queue ..." error message the second time we use the control and the X++ won't be called.
            setTimeout(function () { $dyn.callFunction(control.OnDownloadComplete, control, {}); }, 1);
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



        // Return.
        return controller;
    }
})();