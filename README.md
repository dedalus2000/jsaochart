# jsaochart

JsAOChart : Another Organizational Chart in JS

I was unable to find a good -for my needs- organizational chart library, so I tryed to create it by my own: jaoachart is the result..

Try to see the demo with 
```
bash start_http_server.sh  # from the repository root folder, in order to find the index.html
```
it starts a simple python2 http server with a simple example


# Features

JsAOChart works with Departments; in the standard configuration they are rendered as rectangles. They have an unique id: JsAOChart will create them for you if you don't set them, but in this case you will not be able to save the new Departments coordinates (because the server are not able to link ids with departments).

Because, yes, users can be able to move trees and subtrees with the mouse. You can save new objects coordinates by writing a callback that send them back to the server.

In "automatic" mode (for simple trees, I can suppose), JsAOChart will render trees as.. trees :-) Otherwise you can manually draw a very complex organizational chart.

You can define a Department as a "staff" one; in this case the conjunction line will arrive horizontally from the parent

Each department could have different color; if not specified, children will inherit the parent color.

The departments could have persons; they can be listed with different text styles.


# Few notes:
- look at the TODO.txt for the known missing features/requests. I will merge it in this readme very soon
- you can write your own department drawer by passing the relevant function in the 'create_dept' option. It must return a Fabric object; look at the \_create_dept function for the arguments. This part have to be improved

