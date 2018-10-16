<template>
  <div class="owner-page">
    <div class="card-content">
      <div class="app-card elevation-1"></div>
      <div class="app-sep"></div>
      <div class="app-card elevation-1"></div>
    </div>
    <div class="table-content elevation-1">
      <div class="panel-header">
        <h3>{{ $t('owner.tableHeader') }}</h3>
        <div class="search-input">
          <v-text-field
            :placeholder="$t('owner.searchHolder')"
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
            <td>{{ props.item.id }}</td>
            <td>{{ props.item.type }}</td>
            <td>{{ props.item.sender }}</td>
            <td>{{ props.item.receiver }}</td>
            <td>{{ props.item.date }}</td>
            <td>{{ props.item.amount }}</td>
            <td>{{ props.item.fee }}</td>
            <td>{{ props.item.remark }}</td>
          </template>
          <template slot="no-results">
            {{ $t('owner.tableNone') }}
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

const { mapState, mapGetters, mapActions, mapMutations } = createNamespacedHelpers('owner')

export default {
  name: 'Owner',

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
@import "../styles/share";

.owner-page {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;

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
