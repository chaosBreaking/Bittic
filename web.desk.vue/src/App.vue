<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>

export default {
  name: 'App',
 // watch:{
  //  "$route" : "checkLogin"
  //},

 //created() {
 //   this.checkLogin();
 // },
 // mounted() {
    
 // },
  //methods:{
   // checkLogin:function(){
    //  if(!sessionStorage.getItem('web')){
    //    this.$router.push('/')
   //   }
   // }
 // }
}
</script>

<style>
#app{
  height: 100%;
  width: 100%;
}
</style>
