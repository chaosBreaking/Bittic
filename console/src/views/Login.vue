<template>
  <div class="login-page">
    <img src="../assets/images/logo.png">

    <h1 class="white--text">{{ $t('login.title') }}</h1>

    <v-text-field
      color="secondary"
      dark autofocus
      single-line
      :error="inputError"
      :error-messages="errorMnemonic"
      :value="mnemonic"
      :loading="signing"
      @input="updateMnemonic"
      @keyup.13="login"
      :label="$t('login.inputLabel')" />

    <v-select
      color="secondary" dark
      prepend-icon="language"
      :value="currentLang"
      @input="updateCurrentLang"
      :items="supportLangs"
      item-value="code"
      item-text="label"
    />

    <v-btn :loading="signing" dark large color="transparent" @click="login">
      {{ $t('login.loginBtn') }}
    </v-btn>
  </div>
</template>

<script>
import {
  createNamespacedHelpers,
  mapState as mapRootState,
  mapActions as mapRootActions,
} from 'vuex'

const { mapState, mapGetters, mapMutations, mapActions } = createNamespacedHelpers('login')

export default {
  name: 'Login',

  computed: {
    ...mapState([
      'mnemonic',
      'errorMnemonic',
      'signing',
    ]),
    ...mapGetters([
      'inputError',
    ]),
    ...mapRootState([
      'supportLangs',
      'currentLang',
    ]),
  },

  methods: {
    ...mapMutations([
      'updateMnemonic',
    ]),
    ...mapActions([
      'login',
    ]),
    ...mapRootActions([
      'updateCurrentLang',
    ]),
  },
}
</script>

<style scoped lang="scss">
.login-page {
  background: url('../assets/images/bg.jpg') center;
  background-size: cover;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24%;

  & > img {
    width: 120px;
    margin-top: -10%;
  }

  & > h1 {
    margin: 40px 0;
  }

  & /deep/ .v-text-field {
    align-self: stretch;
    flex-grow: 0;
    margin: 10px 0;
  }

  & /deep/ .v-btn {
    align-self: stretch;
    box-shadow: 0 4px 14px #111 !important;
  }
}
</style>
