export default {
  namespaced: true,

  state: {
    pageEntity: [5, 10, 25],
    headers: [
      { text: 'owner.thId', value: 'id', align: 'center' },
      { text: 'owner.thType', value: 'type', align: 'center' },
      { text: 'owner.thSender', value: 'sender', align: 'center' },
      { text: 'owner.thReceiver', value: 'receiver', align: 'center' },
      { text: 'owner.thDate', value: 'date', align: 'center' },
      { text: 'owner.thAmount', value: 'amount', align: 'center' },
      { text: 'owner.thFee', value: 'fee', align: 'center' },
      { text: 'owner.thRemark', value: 'remark', align: 'center' },
    ],
    desserts: [
      // {
      //   id: 'xxxxx',
      //   type: 'zzz',
      //   sender: 'xxx',
      //   receiver: 'dddd',
      //   date: '333',
      //   amount: '12',
      //   fee: 32,
      //   remark: 'xxxx',
      // },
    ],
    fetching: false,
    filter: '',
  },

  mutations: {
    inputFilter(state, filter) {
      state.filter = filter
    },
  },

  actions: {
  },

  getters: {},
}
