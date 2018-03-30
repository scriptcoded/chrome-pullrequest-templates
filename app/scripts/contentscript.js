'use strict';

(function () {
  var defaultUrl = 'https://raw.github.com/sprintly/sprint.ly-culture/master/pr-template.md';
  var options, isCustom;

  var isGH = window.location.href.match(/github.com/);
  var isBB = window.location.href.match(/bitbucket.org/);

  loadOptions(getTemplate);

  function loadOptions (cb) {
    chrome.storage.sync.get({
      githubEnabled: true,
      githubTemplateUrl: defaultUrl,
      githubTemplateContent: '',
      bitbucketEnabled: true,
      bitbucketTemplateUrl: defaultUrl,
      bitbucketTemplateContent: '',
      bitbucketOverwrite: true,

      customEnabled: true,
      customTemplateUrl: defaultUrl,
      customRepoRegex: '',
      customRepoDescriptionID: ''
    }, function (items) {
      options = items;
      cb();
    });
  }

  function insertTemplate (template) {
    var el = null;
    var isBitbucketProseEditor = false;

    // https://bitbucket.org/elma-group/elma-core/pull-requests/new?source=elma-group%2Felma-core%3A%3AELMA-20-fix-errors-on-register-and-regis
    if (isBB && window.location.href.match(/elma-group\/elma-core\/pull-requests\/new/)) {
      var sourceParts = getParameterByName('source').split('/')
      var branchParts = sourceParts[sourceParts.length - 1].split('::')
      var branch = branchParts[branchParts.length - 1]

      template = template.replaceAll('{{branch}}', branch)
    }

    if (isGH && options.githubEnabled) {
      el = document.getElementById('pull_request_body');
    } else if (isBB && options.bitbucketEnabled) {
      // If this looks like an "Edit PR" page, do not insert the template.
      if (window.location.href.indexOf('/update') !== -1) return;

      // Check for new beta editor, falling back to default
      var test = document.getElementById('ak_editor_description');
      isBitbucketProseEditor = !!test;

      // Deal with bitbucket immediately since it's getting a bit bespoke now.
      // One day, we'll re-write this whole thing..
      if (isBitbucketProseEditor) {
        setTimeout(function () {
          el = document.getElementsByClassName('ProseMirror')[0];
          insertContenteditable(el, template, options.bitbucketOverwrite)
        }, 2500);
        return;
      } else {
        el = document.getElementById('id_description');
        insertInput(el, template, options.bitbucketOverwrite)
      }


    } else if (isCustom && options.customEnabled && options.customRepoDescriptionID) {
      el = document.getElementById(options.customRepoDescriptionID.toString());
    }

    if (el === null) return;

    if (isGH)
      return insertInput(el, template, true);

    // If this looks like an "Edit PR" page, do not insert the template.
    if (window.location.href.indexOf('/update') !== -1) return;

    if (isCustom)
      insertInput(el, template, options.bitbucketOverwrite);
  }

  // Old textarea editor
  function insertInput (el, template, overwrite) {
    if (overwrite) {
      el.value = template;
    } else {
      setTimeout(function () {
        el.value = el.value + ((el.value && el.value.length ? '\r\n' : '') + template);
      }, 1000);
    }
  }

  // New contenteditable editor
  function insertContenteditable (el, template, overwrite) {
    console.log(el.innerHTML)
    setTimeout(function () {
      if (overwrite) {
        el.innerHTML = marked(template);
      } else {
        el.innerHTML = el.innerHTML + ((el.innerHTML && el.innerHTML.length ? '<br/>' : '') + marked(template));
      }
    }, 1000)
  }

  function getTemplate () {
    var templateToLoad;
    var xhr = new XMLHttpRequest();

    isCustom = (options.customRepoRegex) ? new RegExp(options.customRepoRegex).test(window.location.href) : false;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        insertTemplate(xhr.responseText);
      }
    };

    if (isGH) {
      // GitHub cannot retrieve from external URL due to cross origin rules.
      insertTemplate(options.githubTemplateContent);
    } else if (isBB) {
      if (options.bitbucketTemplateContent) return insertTemplate(options.bitbucketTemplateContent);
      templateToLoad = options.bitbucketTemplateUrl;
    } else if (isCustom) {
      if (options.customTemplateContent) return insertTemplate(options.customTemplateContent);
      templateToLoad = options.customTemplateUrl;
    }

    if (templateToLoad) {
      xhr.open("GET", (templateToLoad), true);
      xhr.send();
    }

  }
})();

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};