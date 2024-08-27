(function () {
    "use strict";

    var _editorId = undefined;
    var _editorConfig = undefined;
    var _isReadOnly = false;
    var _allowPlaceholders = false;
    var _placeholders = undefined;
    var _allowEmailTemplates = false;
    var _emailTemplates = undefined;
    var _usedForEmailTemplates = false;
    var _placeholderDelimiterString;
    var _editorWidth = undefined;
    var _editorHeight = undefined;


    // Start an instance of CKEDITOR.
    var reloadedTrigger = function contentReloaded() {
        if (window.parent) {
            $('.htmlEditorHost').css('visibility', 'hidden');

            /**
            * Creates an instance of CKEDITOR.
            * @param {String} [editorId] The unique editor instance id..
            * @param {Boolean} [isReadOnly] The flag indicating whether the editor can be editable.
            * @param {Boolean} [allowMaximize] The flag indicating whether the editor can be maximized.
            * @param {Boolean} [allowPlaceholders] The flag indicating whether the use of placeholders is allowed in the editor.
            * @param {Object} [placeholders] The list of palceholders available in the editor.
            * @param {Boolean} [allowEmailTemplates] The flag indicating whether the use of email templates is allowed in the editor.
            * @param {Object} [emailTemplates] The list of email templates available in the editor.
            * @param {Boolean} [usedForEmailTemplates] The flag indicating whether placeholders are used for email templates.
            * @param {String} [contentHtml] Editor's data.
            * @param {BigInteger} [editorWidth] Editor width.
            * @param {BigInteger} [editorHeight] Editor height.
            */
            window.createEditor = function createEditor(editorId, isReadOnly, allowMaximize, allowPlaceholders, placeholders, allowEmailTemplates,
                emailTemplates, usedForEmailTemplates, contentHtml, editorWidth, editorHeight) {
                _editorId = editorId;

                // Set the editor's default configuration depending on AllowMaximize property.
                _editorConfig = allowMaximize == true ? configNormal : configNormalWithoutMaximize;

                _isReadOnly = isReadOnly;
                _allowPlaceholders = allowPlaceholders;
                _placeholders = placeholders;
                _allowEmailTemplates = allowEmailTemplates;
                _emailTemplates = emailTemplates;
                _usedForEmailTemplates = usedForEmailTemplates;
                _editorWidth = editorWidth;
                _editorHeight = editorHeight;

                // Set placeholder delimiter depending on UsedForEmailTemplates property.
                if (_usedForEmailTemplates == true)
                    _placeholderDelimiterString = "%";
                else
                    _placeholderDelimiterString = "@";

                // Create textarea tag element which holds an instance of CKEDITOR.
                var textArea = document.createElement('textarea');
                textArea.id = _editorId;
                textArea.name = _editorId;
                textArea.setAttribute('onchange', 'window.handleUserValue(event)');
                textArea.value = contentHtml;
                var element = document.getElementById('div_EditorContainer');
                element.appendChild(textArea);

                // Register extra plugins in CKEDITOR.
                if (CKEDITOR.plugins.registered.placeholder == null)
                    registerPlaceholderPlugin();
                if (CKEDITOR.plugins.registered.emailTemplate == null)
                    registerEmailTemplatePlugin();

                // Set extra plugins in CKEDITOR configurations.
                setPlaceholderPlugin();
                setEmailTemplatePlugin();

                // Create an instance of CKEDITOR
                startRichTextEditor(contentHtml);
            }

            /**
             * Called when the editor's data is changed.
             * The change can be made by the user (client side) or in code (server side).
             */
            window.handleUserValue = function (event) {
                var userValue = event.target.value;

                // We need to ensure to have \r\n as new lines instead of just '\n'.
                // Modern SMTP servers require CRLF (emails with bare LF can be rejected).
                userValue = userValue.replace(/\r?\n/g, "\r\n")

                // Update the SourceString property on server side with the changed data.
                window.parent.postMessage({ type: 'setSourceStringClient', id: _editorId, userValue: userValue }, location.origin);
            };

            /**
             * Observes the changes of the SetSourceStringServer property.
             * The editor's data is updated with a new value if the property is changed on server side.
             */
            window.setEditorData = function (contentHtml) {
                var myEditor = getCKEditorInstance(_editorId);
                if (myEditor != null) {
                    // Update the editor's data with a new value.
                    myEditor.setData(contentHtml, {
                        internal: false,
                        callback: function () {
                            myEditor.fire('change');
                        },
                        noSnapshot: true
                    });
                }
            };

            /**
             * Observes the changes of isReadOnly flag.
             * The editor changes the ReaOnly state if the flag is changed.
             */
            window.setEditorReadOnly = function (isReadOnly) {
                _isReadOnly = isReadOnly;

                var myEditor = getCKEditorInstance(_editorId);
                if (myEditor != null) {
                    if (myEditor.status == 'ready')
                        if (CKEDITOR.env.ie)
                            // Timeout added to avoid javascript error Permission denied in IE.
                            setTimeout(function () {
                                myEditor.fire('dataReady');
                            }, 150);
                        else
                            myEditor.fire('dataReady');
                }
            }

            /**
             * Observes the changes of the RefreshControl property.
             * The editor is recreated if the property is set to true.
             */
            window.refreshEditor = function (refreshControl) {
                if (refreshControl == true) {
                    var myEditor = getCKEditorInstance(_editorId);
                    if (myEditor != null) {
                        // Recreate the editor.
                        if (myEditor.status == 'ready') {
                            myEditor.destroy(false);
                            myEditor = createCKEditorInstance(_editorId, _editorConfig);
                        }
                    }
                }
            }

            /**
             * Observes the changes of the AllowPlaceholders property.
             * The editor is recreated if the plugins configuration is changed.
             */
            window.setEditorAllowPlaceholders = function (allowPlaceholders) {
                _allowPlaceholders = allowPlaceholders;

                setPlaceholderPlugin();

                var myEditor = getCKEditorInstance(_editorId);
                if (myEditor != null) {
                    // Recreate the editor.
                    if (myEditor.status == 'ready') {
                        if (CKEDITOR.env.ie)
                            setTimeout(function () {
                                myEditor.destroy(false);
                                myEditor = createCKEditorInstance(_editorId, _editorConfig);
                            }, 150);
                        else {
                            myEditor.destroy(false);
                            myEditor = createCKEditorInstance(_editorId, _editorConfig);
                        }
                    }
                }
            }

            /**
             * Observes the changes of the AllowEmailTemplates property.
             * The editor is recreated if the plugins configuration is changed.
             */
            window.setEditorAllowEmailTemplates = function (allowEmailTemplates) {
                _allowEmailTemplates = allowEmailTemplates;

                setEmailTemplatePlugin();

                var myEditor = getCKEditorInstance(_editorId);
                if (myEditor != null) {
                    // Recreate the editor.
                    if (myEditor.status == 'ready') {
                        if (CKEDITOR.env.ie)
                            setTimeout(function () {
                                myEditor.destroy(false);
                                myEditor = createCKEditorInstance(_editorId, _editorConfig);
                            }, 150);
                        else {
                            myEditor.destroy(false);
                            myEditor = createCKEditorInstance(_editorId, _editorConfig);
                        }
                    }
                }
            }

            /**
             * Sets the email template body for the selected email template id.
             */
            window.setEmailTemplateBody = function (contentHtml) {
                var myEditor = getCKEditorInstance(_editorId);
                if (myEditor != null) {
                    // Update the editor's data with a new value.
                    if (myEditor.getData() == '')
                        myEditor.setData(contentHtml);
                    else
                        myEditor.insertHtml(contentHtml);
                }
            }

            /**
            * Disposes the editor.
            */
            window.onunload = function () {
                var myEditor = getCKEditorInstance(_editorId);
                if (myEditor != null) {
                    myEditor.destroy(true);
                    if (jQuery.isEmptyObject(CKEDITOR.instances)) {
                        configNormal.extraPlugins = '';
                        configNormalWithoutMaximize.extraPlugins = '';
                        configMaximized.extraPlugins = '';
                        CKEDITOR.plugins.registered.placeholder = null;
                        CKEDITOR.plugins.registered.emailTemplate = null;
                    }
                }
                window.removeEventListener('resize', resizeCKEditor);
            };

            /**
            * Listen for the window resize and resize the editor.
            */
            window.addEventListener('resize', resizeCKEditor);

            window.parent.postMessage({ type: 'contentReloaded', id: window.location.hash }, location.origin);
        }
    }
    window.onload = reloadedTrigger;

    /**
    * Registers Placeholder plugin in CKEDITOR.
    */
    function registerPlaceholderPlugin() {
        // Add plug-in
        CKEDITOR.plugins.add('placeholder', {
            init: function (editor) {
                // Placeholders ComboBox
                editor.ui.addRichCombo('placeholders', {
                    label: "P",
                    title: "Insert Placeholder",
                    voiceLabel: "Insert placeholder",
                    className: 'cke_combo_placeholders',
                    multiSelect: false,
                    toolbar: 'templating',

                    panel: {
                        css: [editor.config.contentsCss, CKEDITOR.getUrl('skins/moono-lisa/editor.css')],
                        voiceLabel: editor.lang.format.panelVoiceLabel
                    },

                    init: function () {
                        var list = this;
                        if (_placeholders != undefined) {
                            $.each(_placeholders, function (index, placeholder) {
                                list.add(placeholder.name, placeholder.description, placeholder.description);
                            });
                        }
                    },

                    onClick: function (value) {
                        var placeholder = $.grep(_placeholders, function (a) { return a.name == value; })[0];

                        if (placeholder.html == null)
                            editor.insertText(_placeholderDelimiterString + value + _placeholderDelimiterString);
                        else
                            editor.insertHtml(placeholder.html);
                    }
                });
            }
        });
    }

    /**
    * Registers EmailTemplate plugin in CKEDITOR.
    */
    function registerEmailTemplatePlugin() {
        CKEDITOR.plugins.add('emailTemplate', {
            init: function (editor) {
                // EmailTemplates ComboBox
                editor.ui.addRichCombo('emailTemplates', {
                    label: "T",
                    title: "Insert Snippet From Email Template",
                    voiceLabel: "Insert Snippet From Email Template",
                    className: 'cke_combo_emailtemplates',
                    multiSelect: false,
                    toolbar: 'templating',

                    panel: {
                        css: [editor.config.contentsCss, CKEDITOR.getUrl('skins/moono-lisa/editor.css')],
                        voiceLabel: editor.lang.format.panelVoiceLabel
                    },

                    init: function () {
                        var list = this;
                        if (_emailTemplates != undefined) {
                            $.each(_emailTemplates, function (index, emailTemplate) {
                                list.add(emailTemplate.name + ' | ' + emailTemplate.lang, emailTemplate.name + ' | ' + emailTemplate.lang);
                            });
                        }
                    },

                    onClick: function (value) {
                        var emailTemplate = $.grep(_emailTemplates, function (a) { return (a.name + ' | ' + a.lang) == value; })[0];

                        // Get email template body for the selected email template id.
                        window.parent.postMessage({ type: 'getEmailTemplateBody', id: _editorId, emailTemplateId: emailTemplate.name, languageId: emailTemplate.lang }, location.origin);
                    }
                });
            }
        });
    }
    
    /**
    * Sets Placeholder plugin depending on AllowPlaceholders property.
    */
    function setPlaceholderPlugin() {
        if (_allowPlaceholders) {
            if (configNormal.extraPlugins.indexOf('placeholder') == -1)
                configNormal.extraPlugins += (configNormal.extraPlugins == '' ? '' : ',') + 'placeholder';
            if (configNormalWithoutMaximize.extraPlugins.indexOf('placeholder') == -1)
                configNormalWithoutMaximize.extraPlugins += (configNormalWithoutMaximize.extraPlugins == '' ? '' : ',') + 'placeholder';
            if (configMaximized.extraPlugins.indexOf('placeholder') == -1)
                configMaximized.extraPlugins += (configMaximized.extraPlugins == '' ? '' : ',') + 'placeholder';
        } else {
            configNormal.extraPlugins = configNormal.extraPlugins.replace('placeholder', '');
            configNormalWithoutMaximize.extraPlugins = configNormalWithoutMaximize.extraPlugins.replace('placeholder', '');
            configMaximized.extraPlugins = configMaximized.extraPlugins.replace('placeholder', '');
        }
    }

    /**
    * Sets EmailTemplate plugin depending on AllowEmailTemplates property.
    */
    function setEmailTemplatePlugin() {
        if (_allowEmailTemplates) {
            if (configNormal.extraPlugins.indexOf('emailTemplate') == -1)
                configNormal.extraPlugins += (configNormal.extraPlugins == '' ? '' : ',') + 'emailTemplate';
            if (configNormalWithoutMaximize.extraPlugins.indexOf('emailTemplate') == -1)
                configNormalWithoutMaximize.extraPlugins += (configNormalWithoutMaximize.extraPlugins == '' ? '' : ',') + 'emailTemplate';
            if (configMaximized.extraPlugins.indexOf('emailTemplate') == -1)
                configMaximized.extraPlugins += (configMaximized.extraPlugins == '' ? '' : ',') + 'emailTemplate';
        } else {
            configNormal.extraPlugins = configNormal.extraPlugins.replace('emailTemplate', '');
            configNormalWithoutMaximize.extraPlugins = configNormalWithoutMaximize.extraPlugins.replace('emailTemplate', '');
            configMaximized.extraPlugins = configMaximized.extraPlugins.replace('emailTemplate', '');
        }
    }

    /**
     * Creates an instance of CKEDITOR.
     * @param {String} [editorName] Name to be used for editor instance. Must be the same as containing element in DOM.
     * @param {Object} [config] Startup configuration used by the editor.
     * @returns {CKEDITOR} A new instance of CKEDITOR.
     */
    function createCKEditorInstance(editorName, config) {
        var editor = CKEDITOR.replace(editorName, config);

        // Common wiring of events.
        editor.on('key', function (evt) {
            // If CTRL + A is pressed select all content
            if (evt.data.keyCode == CKEDITOR.CTRL + 65) {
                evt.cancel();
                evt.editor.execCommand('selectAll');
            }
        });

        return editor;
    }

    /**
    * Gets an instance of CKEDITOR for provided editor instance id.
    * @param {String} [instanceId] Editor instance id.
    * @returns {CKEDITOR} An existing instance of CKEDITOR.
    */
    function getCKEditorInstance(instanceId) {
        if (CKEDITOR.instances != null)
            for (var i in CKEDITOR.instances) {
                if (CKEDITOR.instances[i].name == instanceId) {
                    return CKEDITOR.instances[i];
                }
            }
        return null;
    }

    /**
    * Sets the size of an instance of CKEDITOR.
    */
    function resizeCKEditor() {
        // Set the proper size of the editor. By default the editor height is the height of the editing area.
        // It does not include the toolbar or the boottom bar. To overcome this the editors default height 
        // needs to be set to 0 and then call resize to set the desired height of the whole editor.
        // The height of the editor is equal to the height of the container control.
        var myEditor = getCKEditorInstance(_editorId);
        if (myEditor != null) {
            if (myEditor.status == 'ready') {
                _editorHeight = myEditor.element.getParent().getParent().getClientSize().height - 5;
                myEditor.resize(_editorWidth, _editorHeight);
            }
        }
    }

    /**
     * Starts an instance of CKEDITOR.
     * @param {String} [contentHtml] A data for the created editor instance.
     */
    function startRichTextEditor(contentHtml) {
        // Variables
        var isInitialized = false;

        // Create editor.
        createCKEditorInstance(_editorId, _editorConfig);

        // Event 'instanceCreated'
        CKEDITOR.on('instanceCreated', function (evt) {
            if ((evt == null) || (evt.editor == null)) return;

            // Hook to editor instance event contentDom.
            evt.editor.on('contentDom', function (e) {
                // Set tabindex to trigger keydown also in readonly mode.
                e.editor.element.getNext().setAttribute("tabindex", "-1");
                e.editor.document.getBody().setAttribute('tabindex', '-1');
            });

            // Hook to editor instance event instanceReady.
            evt.editor.on('instanceReady', function (e) {
                // Hook to events on current editor instance.
                e.editor.on('blur', onEditorBlur);
                e.editor.on('change', onEditorChange);
                e.editor.on('beforeCommandExec', onEditorBeforeCommandExec);
                e.editor.on('dataReady', onDataReady);
                e.editor.on('readOnly', onReadOnly);
                e.editor.on('mode', onMode);

                // Set readonly state for the first time.
                e.editor.setReadOnly(_isReadOnly);
            });
        });

        // Event 'instanceReady'.
        CKEDITOR.on('instanceReady', function (evt) {
            if ((evt == null) || (evt.editor == null)) return;

            if (isInitialized == false) {
                // Set editor's data.
                evt.editor.setData(contentHtml);

                // Hook to events.
                // DO NOT MOVE this event hooks outside this if statement!!!
                // The problem is when the editor is first time created the event instanceCreated is not fired,
                // only this static event instanceReady. After that the event instanceCreated is fired every time 
                // when the editor is recreated. It is also fired when we reopen the form. If the event instanceCreated
                // is not fired then also the event instanceReady on the current editor instance is not fired.
                evt.editor.on('blur', onEditorBlur);
                evt.editor.on('change', onEditorChange);
                evt.editor.on('beforeCommandExec', onEditorBeforeCommandExec);
                evt.editor.on('dataReady', onDataReady);
                evt.editor.on('readOnly', onReadOnly);
                evt.editor.on('mode', onMode);

                isInitialized = true;
            }

            // Set the size of the editor.
            resizeCKEditor();
            $('.htmlEditorHost').css('visibility', 'visible');

            // Enable command selectAll for both editor modes: wysiwyg and source.
            var selectAllCommand = evt.editor.getCommand('selectAll');
            if (selectAllCommand != null) {
                selectAllCommand.nodes = { wysiwyg: 1, source: 1 };
                selectAllCommand.readOnly = true;
                selectAllCommand.enable();
            }
        });

        // onEditorBlur
        function onEditorBlur(evt) {
            if ((evt == null) || (evt.editor == null)) return;

            onCommit(evt);
            evt.stop();
        }

        // onEditorChange
        function onEditorChange(evt) {
            if ((evt == null) || (evt.editor == null)) return;

            onCommit(evt);
            evt.stop();
        }

        // onEditorBeforeCommandExec
        function onEditorBeforeCommandExec(evt) {
            if ((evt == null) || (evt.editor == null)) return;

            if (evt.data.name == "maximize") {
                if (evt.editor.commands.maximize.state == 2) {
                    // Commit changes when maximizing the editor
                    onCommit(evt);
                    evt.cancel();

                    window.parent.postMessage({ type: 'maximizeEditor', id: _editorId }, location.origin);
                }
            }
        }

        // onDataReady
        function onDataReady(evt) {
            if ((evt == null) || (evt.editor == null)) return;

            // setReadOnly needs to be executed after setData ends to avoid javascript error Permission denied.
            evt.editor.setReadOnly(_isReadOnly);

            // Set background color depending on readOnly property.
            onReadOnly(evt);
        }

        // onReadOnly
        function onReadOnly(evt) {
            if ((evt == null) || (evt.editor == null)) return;

            // Set background color of the editor depending on readOnly property.
            if (_isReadOnly)
                evt.editor.editable().setStyle('background-color', '#FAF9F8');
            else
                evt.editor.editable().setStyle('background-color', '#FFFFFF');
        }

        // onMode
        function onMode(evt) {
            if ((evt == null) || (evt.editor == null)) return;

            // Set background color depending on readOnly property.
            onReadOnly(evt);

            if (evt.editor.mode == 'source') {
                var editable = evt.editor.editable();
                editable.attachListener(editable, 'keydown', function (e) {
                    // If ENTER is pressed in Source Mode prevent to close the form
                    if (e.data.getKey() == 13)
                        e.data.stopPropagation();
                })
                editable.attachListener(editable, 'change', function (e) {
                    // Commit changes made in Source Mode
                    onCommit(e.sender);
                })
            }
        }

        // onCommit
        function onCommit(evt) {
            if ((evt == null) || (evt.editor == null)) return;

            if (evt.editor.status == 'ready') {
                $('#' + _editorId).val(evt.editor.getData());
                $('#' + _editorId).trigger('change');
            }
        }
    }

    // Normal configuration with maximize button
    var configNormal = {
        customConfig: '',
        height: 0,
        removePlugins: 'elementspath',
        resize_enabled: false,
        allowedContent: true,
        fillEmptyBlocks: false,

        fontSize_sizes: '8 px/8px;9 px/9px;10 px/10px;11 px/11px;12 px/12px;13 px/13px;14 px/14px;15 px/15px;16 px/16px;18 px/18px;20 px/20px;22 px/22px;24 px/24px;26 px/26px;28 px/28px;36 px/36px;48 px/48px;72 px/72px;',

        toolbarGroups: [
            { name: 'tools', groups: ['tools'] },
            { name: 'document', groups: ['mode', 'document', 'doctools'] },
            { name: 'clipboard', groups: ['clipboard', 'undo'] },
            { name: 'templating' },
            { name: 'editing', groups: ['find', 'selection', 'editing'] },
            { name: 'forms', groups: ['forms'] },
            { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'] },
            { name: 'links', groups: ['links'] },
            { name: 'insert', groups: ['insert'] },
            '/',
            { name: 'styles', groups: ['styles'] },
            { name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
            { name: 'colors', groups: ['colors'] },
            { name: 'others', groups: ['others'] },
            { name: 'about', groups: ['about'] }
        ],

        removeButtons: 'Save,Preview,Print,NewPage,Templates,PasteFromWord,Cut,Copy,Paste,PasteText,PasteFromWord,Find,Replace,SelectAll,Scayt,Form,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField,CopyFormatting,RemoveFormat,Blockquote,CreateDiv,BidiLtr,BidiRtl,Language,Link,Unlink,Anchor,Image,Flash,PageBreak,Iframe,SpecialChar,Table,HorizontalRule,Smiley,ShowBlocks,About,Font,FontSize,Strike,Subscript,Superscript,Styles,ExportPdf',

        extraPlugins: ''
    };

    // Normal configuration without maximize button
    var configNormalWithoutMaximize = {
        customConfig: '',
        height: 0,
        removePlugins: 'elementspath',
        resize_enabled: false,
        allowedContent: true,
        fillEmptyBlocks: false,

        fontSize_sizes: '8 px/8px;9 px/9px;10 px/10px;11 px/11px;12 px/12px;13 px/13px;14 px/14px;15 px/15px;16 px/16px;18 px/18px;20 px/20px;22 px/22px;24 px/24px;26 px/26px;28 px/28px;36 px/36px;48 px/48px;72 px/72px;',

        toolbarGroups: [
            { name: 'tools', groups: ['tools'] },
            { name: 'document', groups: ['mode', 'document', 'doctools'] },
            { name: 'clipboard', groups: ['clipboard', 'undo'] },
            { name: 'templating' },
            { name: 'editing', groups: ['find', 'selection', 'editing'] },
            { name: 'forms', groups: ['forms'] },
            { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'] },
            { name: 'links', groups: ['links'] },
            { name: 'insert', groups: ['insert'] },
            '/',
            { name: 'styles', groups: ['styles'] },
            { name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
            { name: 'colors', groups: ['colors'] },
            { name: 'others', groups: ['others'] },
            { name: 'about', groups: ['about'] }
        ],

        removeButtons: 'Maximize,Save,Preview,Print,NewPage,Templates,PasteFromWord,Find,Replace,SelectAll,Scayt,Form,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField,CopyFormatting,RemoveFormat,Blockquote,CreateDiv,Language,Anchor,Flash,Iframe,ShowBlocks,About,Styles,ExportPdf',

        extraPlugins: ''
    };

    // Maximized configuration
    var configMaximized = {
        customConfig: '',
        removePlugins: 'elementspath',
        resize_enabled: false,
        allowedContent: true,
        fillEmptyBlocks: false,

        fontSize_sizes: '8 px/8px;9 px/9px;10 px/10px;11 px/11px;12 px/12px;13 px/13px;14 px/14px;15 px/15px;16 px/16px;18 px/18px;20 px/20px;22 px/22px;24 px/24px;26 px/26px;28 px/28px;36 px/36px;48 px/48px;72 px/72px;',

        toolbarGroups: [
            { name: 'tools', groups: ['tools'] },
            { name: 'document', groups: ['mode', 'document', 'doctools'] },
            { name: 'clipboard', groups: ['clipboard', 'undo'] },
            { name: 'templating' },
            { name: 'editing', groups: ['find', 'selection', 'editing'] },
            { name: 'forms', groups: ['forms'] },
            { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'] },
            { name: 'links', groups: ['links'] },
            { name: 'insert', groups: ['insert'] },
            '/',
            { name: 'styles', groups: ['styles'] },
            { name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
            { name: 'colors', groups: ['colors'] },
            { name: 'others', groups: ['others'] },
            { name: 'about', groups: ['about'] }
        ],

        removeButtons: 'Save,Preview,Print,NewPage,Templates,PasteFromWord,Find,Replace,SelectAll,Scayt,Form,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField,CopyFormatting,RemoveFormat,Blockquote,CreateDiv,Language,Anchor,Flash,Iframe,ShowBlocks,About,Styles,ExportPdf',

        extraPlugins: ''
    };
})();