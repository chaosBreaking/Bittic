import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { storage } from '../services'
import en from './en'
import axios from 'axios'

Vue.use(VueI18n)

const loadedLanguages = [ 'en' ]

export const i18n = new VueI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
})

function setI18nLanguage(lang) {
  i18n.locale = lang
  axios.defaults.headers.common['Accept-Language'] = lang
  document.querySelector('html').setAttribute('lang', lang)
  storage.currentLanguage = lang
  return lang
}

export async function loadLanguageAsync(lang) {
  // noinspection JSIgnoredPromiseFromCall
  if (i18n.locale !== lang) {
    if (!loadedLanguages.includes(lang)) {
      const langRes = await import(`@/i18n/${lang}`)
      loadedLanguages.push(lang)
      i18n.setLocaleMessage(lang, langRes.default)
      return setI18nLanguage(lang)
    }
    return setI18nLanguage(lang)
  }
  return lang
}

loadLanguageAsync(storage.currentLanguage)
