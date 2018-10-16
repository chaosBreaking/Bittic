<template>
  <div class="chain-page">
    <div class="card-content">
      <div @click="showModal" class="app-card elevation-1"></div>
      <div class="app-sep"></div>
      <div class="app-card elevation-1"></div>
      <div class="app-sep"></div>
      <div class="app-card elevation-1"></div>
    </div>

    <div class="table-content elevation-1">
      <div class="panel-header">
        <h3>{{ $t('chain.tableHeader') }}</h3>
        <div class="search-input">
          <v-text-field
            :placeholder="$t('chain.searchHolder')"
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
            <td>{{ props.item.height }}</td>
            <td>{{ props.item.timestamp }}</td>
            <td>{{ props.item.type }}</td>
            <td>{{ props.item.id }}</td>
          </template>
          <template slot="no-results">
            {{ $t('chain.tableNone') }}
          </template>
        </v-data-table>
      </template>
    </div>

    <v-dialog v-model="modal" persistent>
      <v-card class="app-modal">
        <v-card-title>事务列表</v-card-title>

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
            <td>{{ props.item.height }}</td>
            <td>{{ props.item.timestamp }}</td>
            <td>{{ props.item.type }}</td>
            <td>{{ props.item.id }}</td>
          </template>
          <template slot="no-results">
            {{ $t('chain.tableNone') }}
          </template>
        </v-data-table>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary darken-1" flat @click.native="hideModal">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import {
  createNamespacedHelpers,
} from 'vuex'

const { mapState, mapGetters, mapActions, mapMutations } = createNamespacedHelpers('chain')

export default {
  name: 'Chain',

  computed: {
    ...mapState([
      'headers',
      'desserts',
      'pageEntity',
      'fetching',
      'filter',
      'modal',
    ]),
    ...mapGetters([]),
  },

  methods: {
    ...mapActions([
    ]),
    ...mapMutations([
      'inputFilter',
      'showModal',
      'hideModal',
    ]),
  },
}
</script>

<style scoped lang="scss">
.chain-page {

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
