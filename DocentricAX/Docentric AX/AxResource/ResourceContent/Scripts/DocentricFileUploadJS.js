(function () {
    "use strict";

    var allowedFileExtensions;

    $dyn.controls.DocentricFileUploadHTM = function (control, element) {
        var control = this;
        $dyn.ui.Control.apply(control, arguments);


        $("#cmd_Upload").on("click", function () {
            $("#div_UploadProgress").attr("display", "block");

            $("#file").click();
        });


        $("#file").on("change", function () {
            $("#div_UploadProgress").css("display", "none");

            if (this.files.length == 0) return;

            $("#txt_FileName").val(this.files[0].name);

            $("#div_UploadProgress").css("display", "block");

            GetFileNameAndBase64Content(this.files[0], OnGetBase64Completed);
        });


        // GetFileNameAndBase64Content
        function GetFileNameAndBase64Content(file, completedFunction) {
            var reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function () {
                var base64result = reader.result.split(',')[1];
                completedFunction(file.name, base64result);
            };
            reader.onerror = function (error) {
                console.log('Error: ', error);
            };
        }


        // OnGetBase64Completed
        function OnGetBase64Completed(fileName, fileBase64Contant) {
            //alert(fileName + ": " + fileBase64Contant.length);

            // Call the X++ method to upload the file.
            $dyn.callFunction(control.UploadFile, control, { _fileName: fileName, _fileContent: fileBase64Contant });
        };
    };




    $dyn.controls.DocentricFileUploadHTM.prototype = $dyn.extendPrototype($dyn.ui.Control.prototype, {
        init: function (data, element) {
            var self = this;
            $dyn.ui.Control.prototype.init.apply(this, arguments);

            allowedFileExtensions = $dyn.value(data.AllowedFileExtensions);
        }
    });
})();