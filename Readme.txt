Version Control File Structure.
-------------------------------------------------------------------------------
Add all Dynamics 365 X++ customizations under the Metadata folder.

Example tree structure:
$/Project/Trunk/Main/Metadata
+---MyMainModule
|   +---Descriptor
|   |       MyMainModule.xml
|   |
|   +---MyMainModule
|       +---AxClass
|       |       MyClass.xml
|       |
|       \---AxTable
|               MyMainTable.xml
|
\---MyOtherModule
    +---Descriptor
    |       MyOtherModule.xml
    |
    \---MyOtherModule
        \---AxClass
                MyTestClass.xml

Please see https://ax.help.dynamics.com for more details.