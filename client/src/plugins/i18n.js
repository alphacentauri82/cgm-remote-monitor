import Vue from 'vue'
import VueI18n from 'vue-i18n'
import store from '@/store/store'

Vue.use(VueI18n)
//If lang translations is not defined or supported i18n will use english translation by default.
//If actually english is selected .. just load english translation file. Else load the language translation file and the english translation 
var translations = (store.state.settings.language=='en')?{'lang':require('@/lang/'+store.state.settings.language+'.json')}:{'lang':require('@/lang/'+store.state.settings.language+'.json'),'en':require('@/lang/en.json')};
export const i18n = new VueI18n({
    locale:'lang',
    fallbackLocale:'en',
    //messages:{'lang':require('@/lang/'+store.state.settings.language+'.json'),'en':require('@/lang/en.json')}
    messages:translations
});