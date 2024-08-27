(function () {
    "use strict";

    var placeholders = undefined;
    var emailTemplates = undefined;
    var control = undefined;
    var oldControl = undefined;
    var editorInitialized = false;
    var editorMaximized = false;


    /**
    * Initializes an instance of the control.
    */
    $dyn.controls.DocentricHtmlEditorHTM = function (data, element) {
        control = this;
        $dyn.ui.Control.apply(control, arguments);

        /**
         * Observes the changes of the RefreshControl property. 
         * The editor is recreated if the property is set to true.
         */
        $dyn.observe(control.RefreshControl, function RefreshControlObserver(refreshControl) {
            if (refreshControl) {
                if (control.$iframeElement[0] && control.$iframeElement[0].contentWindow && control.$iframeElement[0].contentWindow.refreshEditor) {
                    var contentWindow = control.$iframeElement[0].contentWindow;
                    contentWindow.refreshEditor(refreshControl);
                    editorInitialized = false;
                }

                // Timeout added to properly update the RefreshControl property on server side.
                setTimeout(function () {
                    $dyn.callFunction(control.ResetRefreshControl, control, {});
                }, 150);
            }
        })

        /**
         * Observes the changes of the SetSourceStringServer property. 
         * The editor's data is updated with a new value if the property is changed on server side.
         */
        $dyn.observe(control.SetSourceStringServer, function SetSourceStringServerObserver(contentHtml) {
            var contentWindow = undefined;
            var setEditorData = false;

            if (control.$iframeElement[0] && control.$iframeElement[0].contentWindow) {
                contentWindow = control.$iframeElement[0].contentWindow;
                setEditorData = contentHtml != $dyn.peek(control.SourceString);
            }
            else if (oldControl && oldControl.$iframeElement[0] && oldControl.$iframeElement[0].contentWindow) {
                contentWindow = oldControl.$iframeElement[0].contentWindow;
                setEditorData = contentHtml != $dyn.peek(oldControl.SourceString);
            }

            if (setEditorData && contentWindow && contentWindow.setEditorData)
                contentWindow.setEditorData(contentHtml);
        })

        /**
         * Observes the changes of the AllowPlaceholders property. 
         * The editor is recreated if the plugins configuration is changed.
         */
        $dyn.observe(control.AllowPlaceholders, function AllowPlaceholdersObserver(allowPlaceholders) {
            if (!control.$iframeElement[0] || !control.$iframeElement[0].contentWindow || !control.$iframeElement[0].contentWindow.setEditorAllowPlaceholders)
                return;

            var contentWindow = control.$iframeElement[0].contentWindow;
            contentWindow.setEditorAllowPlaceholders(allowPlaceholders);
        })

        /**
         * Observes the changes of the AllowEmailTemplates property. 
         * The editor is recreated if the plugins configuration is changed.
         */
        $dyn.observe(control.AllowEmailTemplates, function AllowEmailTemplatesObserver(allowEmailTemplates) {
            if (!control.$iframeElement[0] || !control.$iframeElement[0].contentWindow || !control.$iframeElement[0].contentWindow.setEditorAllowEmailTemplates)
                return;

            var contentWindow = control.$iframeElement[0].contentWindow;
            contentWindow.setEditorAllowEmailTemplates(allowEmailTemplates);
        })

        /**
         * Computes the value of isReadOnly flag.
         * The flag is set to true if the Enabled property is false or the IsViewMode property is true 
         * or the is AllowEdit propertty is false.
         */
        control.isReadOnly = $dyn.computed(function () {
            return !$dyn.value(control.Enabled) || $dyn.value(control.IsViewMode) || !$dyn.value(control.AllowEdit);
        })

        /**
         * Observes the changes of isReadOnly flag.
         * The editor changes the ReaOnly state if the flag is changed.
         */
        $dyn.observe(control.isReadOnly, function IsReadOnlyObserver(isReadOnly) {
            if (!control.$iframeElement[0] || !control.$iframeElement[0].contentWindow || !control.$iframeElement[0].contentWindow.setEditorReadOnly)
                return;

            var contentWindow = control.$iframeElement[0].contentWindow;
            contentWindow.setEditorReadOnly(isReadOnly);
        })
    };

    /**
    * Creates an instance of the control.
    */
    $dyn.controls.DocentricHtmlEditorHTM.prototype = $dyn.extendPrototype($dyn.ui.Control.prototype, {
        init: function (data, element) {
            control = this;

            // Initialize the control.
            $dyn.ui.Control.prototype.init.apply(this, arguments);

            // Get the list of placeholders to be available in the editor.
            var placeholdersString = $dyn.value(data.Placeholders);
            placeholders = undefined;
            if (placeholdersString != '') {
                placeholders = JSON.parse(placeholdersString);

                placeholders.sort(function (a, b) {
                    if (a.description < b.description)
                        return -1;
                    else if (a.description > b.description)
                        return 1;
                    else
                        return 0;
                });
            }

            // Get the list of email templates to be available in the editor.
            if ($dyn.peek(control.UsedForEmailTemplates) == false) {
                var emailTemplatesString = $dyn.value(data.EmailTemplates);
                emailTemplates = undefined;
                if (emailTemplatesString != '')
                    emailTemplates = JSON.parse(emailTemplatesString);
            }

            // Set the width of the iframe that contains the editor.
            control.editorWidth = $dyn.computed(function () {
                var editorWidth = undefined;

                if ($dyn.peek(control.Width) == $dyn.layout.Size.available)
                    editorWidth = '100%';
                else if ($dyn.peek(control.Width) == $dyn.layout.Size.content || $dyn.peek(control.Width) == 'Auto')
                    editorWidth = '100%';
                else
                    editorWidth = $dyn.peek(control.Width);

                return editorWidth;
            })

            // Set the height of the iframe that contains the editor.
            control.editorHeight = $dyn.computed(function () {
                var editorHeight = undefined;

                if ($dyn.peek(control.Height) == $dyn.layout.Size.available)
                    editorHeight = '100%';
                else if ($dyn.peek(control.Height) == $dyn.layout.Size.content || $dyn.peek(control.Height) == 'Auto' || $dyn.peek(control.Height) == '')
                    editorHeight = 300;
                else
                    editorHeight = $dyn.peek(control.Height);
                return editorHeight;
            })
            
            // Create an iframe that contains an instance of CKEDITOR.
            if (control.$iframeElement == undefined) {
                control.$iframeElement = $('<iframe />', { class: 'iframe_EditorContainer', tabindex: -1, height: $dyn.peek(control.editorHeight), width: $dyn.peek(control.editorWidth), border: 0, padding: 0, margin: 0, display: 'flex' }).appendTo(control.element);
                control.$iframeElement.css('visibility', 'hidden');
                control.$iframeElement.attr('src', $dyn.shell.rootPath + "Resources/Html/DocentricHtmlEditorHTM.htm#" + $dyn.peek(control.EditorId));
            }

            // Add the event listener for messages from the iframe.
            if (editorInitialized == false) {
                window.addEventListener('message', handleMessageEvent);
            }

            /**
            * Initializes the editor in the iframe.
            * @param {Object} [targetHostWindow] A content window in the iframe.
            */
            control.initHtmlEditor = function (targetHostWindow) {
                if (editorInitialized == false && targetHostWindow.createEditor) {
                    targetHostWindow.createEditor(
                        $dyn.peek(control.EditorId),
                        $dyn.peek(control.isReadOnly),
                        $dyn.peek(control.AllowMaximize),
                        $dyn.peek(control.AllowPlaceholders),
                        placeholders,
                        $dyn.peek(control.AllowEmailTemplates),
                        emailTemplates,
                        $dyn.peek(control.UsedForEmailTemplates),
                        $dyn.value(data.SourceString),
                        $dyn.peek(control.editorWidth),
                        $dyn.peek(control.editorHeight));

                    editorInitialized = true;

                    control.$iframeElement.css('visibility', 'visible');
                }
            }
        },

        /**
        * Disposes an instance of the control.
        */
        dispose: function()
        {
            editorInitialized = false;
        },
    });

    /**
    * Handle messages from the iframe.
    * @param {Object} [event] A message event.
    */
    var handleMessageEvent = function (event) {
        if (!window.location.origin)
            window.location.origin = window.location.protocol + "//" + window.location.host;

        if (event.origin !== window.location.origin)
            return;

        // Initialize the editor if the iframe is loaded successfully.
        if (event.data.type === 'contentReloaded' && event.data.id == "#" + $dyn.peek(control.EditorId) && editorInitialized == false) {
            control.$iframeElement = $(control.element).find('.iframe_EditorContainer');
            if (!control.$iframeElement[0].contentWindow) {
                $dyn.logError && $dyn.logError('HTMLEditor Iframe window not found. editorHost[0] is %o', control.$iframeElement[0]);
                return;
            }

            // Initialize the CKEDITOR in the iframe.
            control.initHtmlEditor(control.$iframeElement[0].contentWindow);
        }

        // Get the body of the email template if the email template is selected in the editor.
        if (event.data.type === 'getEmailTemplateBody' && event.data.id == $dyn.peek(control.EditorId)) {
            $dyn.callFunction(control.GetEmailTemplateBody, control, { _emailTemplateId: event.data.emailTemplateId, _languageId: event.data.languageId }, function (contentHtml) {
                if (!control.$iframeElement[0] || !control.$iframeElement[0].contentWindow || !control.$iframeElement[0].contentWindow.setEmailTemplateBody)
                    return;

                var contentWindow = control.$iframeElement[0].contentWindow;
                contentWindow.setEmailTemplateBody(contentHtml);
            });
        }

        // Maximize the editor when the Maximize button is clicked in the editor.
        if (event.data.type === 'maximizeEditor' && event.data.id == $dyn.peek(control.EditorId)) {
            if (editorMaximized == false) {
                oldControl = control;
                editorMaximized = true;
                editorInitialized = false;

                $dyn.callFunction(control.MaximizeEditor, control, {}, function () {
                    control = oldControl;
                    editorMaximized = false;
                });
            }
        }

        // Update the SourceString property on the server when the editor data is changed.
        if (event.data.type === 'setSourceStringClient' && event.data.id == $dyn.peek(control.EditorId)) {
            // Check if the editor's data is changed by the user.
            if (event.data.userValue != $dyn.peek(control.SourceString)) {
                $dyn.callFunction(control.SetSourceStringClient, control, { _value: event.data.userValue });
            }
        }
    }
})();