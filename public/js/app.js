$(document).ready(function(){
  $('#overlay').fadeOut();

  // convert a links to javascript location calls for iOS web app
  var a=document.getElementsByTagName("a");
  for(var i=0;i<a.length;i++)
  {
      a[i].onclick=function()
      {
          window.location=this.getAttribute("href");
          return false
      }
  }
});
