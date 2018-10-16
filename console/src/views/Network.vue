<template>
  <div class="network-page">
    <div class="card-content">
      <div class="app-card elevation-1"></div>
      <div class="app-sep"></div>
      <div class="app-card elevation-1"></div>
      <div class="app-sep"></div>
      <div class="app-card elevation-1"></div>
      <div class="app-sep"></div>
      <div class="app-card elevation-1"></div>
    </div>

    <div class="table-content elevation-1">
      <div class="panel-header">
        <h3>{{ $t('network.tableHeader') }}</h3>
        <div class="search-input">
          <v-text-field
            :placeholder="$t('network.searchHolder')"
            :value="filter"
            @input="inputFilter"
            append-icon="search" />
        </div>
      </div>

      <template>
        <v-data-table
          :headers="headers"
          :items="desserts"
          :total-items="100"
          :rows-per-page-items="pageEntity"
          :loading="fetching"
          class="panel-content elevation-1"
        >
          <template slot="headerCell" slot-scope="props">
            <span>{{ $t(props.header.text) }}</span>
          </template>
          <template slot="items" slot-scope="props">
            <td>{{ props.item.index }}</td>
            <td>{{ props.item.address }}</td>
            <td>{{ props.item.status }}</td>
            <td>{{ props.item.neighbour }}</td>
          </template>
          <template slot="no-results">
            {{ $t('network.tableNone') }}
          </template>
        </v-data-table>
      </template>
    </div>
  </div>
</template>

<script>
import {
  createNamespacedHelpers,
} from 'vuex'

const { mapState, mapGetters, mapActions, mapMutations } = createNamespacedHelpers('network')

export default {
  name: 'Network',

  computed: {
    ...mapState([
      'headers',
      'desserts',
      'pageEntity',
      'fetching',
      'filter',
    ]),
    ...mapGetters([]),
  },

  methods: {
    ...mapActions([
    ]),
    ...mapMutations([
      'inputFilter',
    ]),
  },
}
</script>

<style scoped lang="scss">
.network-page {

  .card-content {
    display: flex;
    padding: 20px;

    .app-card {
      flex: 1;
      height: 100px;
      background-color: white;
    }

    .app-sep {
      width: 20px;
    }
  }

  .table-content {
    flex: 1;
    margin: 0 20px 20px;
    background-color: white;
    display: flex;
    flex-direction: column;

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0 20px;

      .search-input {
        width: 400px;
      }
    }

    .panel-content {
      margin: 0 20px 20px;
    }
  }
}
</style>
