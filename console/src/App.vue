<template>
  <v-app id="app">
    <router-view />
  </v-app>
</template>

<style lang="scss">
@import "./styles/share";
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

html, body, #app {
  @include full-page;
}
</style>
