<template>
  <div class="node-page">
    <div class="card-content">
      <div class="app-card elevation-1"></div>
      <div class="app-sep"></div>
      <div class="app-card elevation-1"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Node',
}
</script>

<style scoped lang="scss">
.node-page {

  .card-content {
    display: flex;
    padding: 20px;

    .app-card {
      flex: 1;
      height: 200px;
      background-color: white;
    }

    .app-sep {
      width: 20px;
    }

  }
}
</style>
