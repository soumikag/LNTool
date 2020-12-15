package lambdanet

import ammonite.ops.Path
import ammonite.{ops => amm}
import funcdiff.ParamCollection
import funcdiff.SimpleMath.{readObjectFromFile, saveObjectToFile}
import lambdanet.PrepareRepos.ParsedRepos
import lambdanet.architecture.GATArchitecture
import lambdanet.train.{DataSet, TopNDistribution}
import lambdanet.translation.PredicateGraph

import scala.collection.parallel.ForkJoinTaskSupport
import scala.concurrent.forkjoin.ForkJoinPool
import scala.util.Random

object TypeInferenceService {

  case class ModelConfig(
      dimMessage: Int = 32,
      gatHeads: Int = 1,
      seed: Long = 1,
  )

  def loadModel(
      paramPath: Path,
      modelCachePath: Path,
      modelConfig: ModelConfig,
      numOfThreads: Int,
      parsedReposDir: Path = amm.pwd / 'data / "parsedRepos",
  ): Model =
    if (amm.exists(modelCachePath)) {
      announced("Load model from cache") {

        readObjectFromFile[Model](modelCachePath.toIO)
      }
    } else {
      import modelConfig._

      println(
        s"No model file found under '$modelCachePath', creating new model..."
      )

      val pc = announced("Load model weights")(
        ParamCollection.fromFile(paramPath)
      )

      val dataSet = announced("Process data set") {
        val repos = ParsedRepos.readFromDir(parsedReposDir)
        DataSet.makeDataSet(
          repos,
          Some(new ForkJoinTaskSupport(new ForkJoinPool(numOfThreads))),
          useSeqModel = false,
          toyMode = false,
          onlyPredictLibType = false
        )
      }
      val model = announced("Create model") {
        val architecture = GATArchitecture(gatHeads, dimMessage, pc)
        Model.fromData(dataSet, architecture, new Random(seed))
      }

      announced(s"Save model to '$modelCachePath'") {
        saveObjectToFile(modelCachePath.toIO)(model)
      }
      model
    }

  case class PredictionResults(
      map: Map[PredicateGraph.PNode, TopNDistribution[PredicateGraph.PType]]
  ) {
    def prettyPrint(): Unit = {
      val byFile = map.keys.groupBy(_.srcSpan.get.srcFile).toSeq.sortBy(_._1)
      byFile.foreach {
        case (file, nodes) =>
          println(s"=== File: $file ===")
          nodes.toSeq.sortBy(_.srcSpan.get.start).foreach { n =>
            val span = n.srcSpan.get.showShort()
            val rankedList = map(n).distr.zipWithIndex
              .map {
                case ((p, ty), i) => {
                  val acc = "%.2f".format(p * 100)
                  s"[${i + 1}]($acc%) ${ty.showSimple}"
                }
              }
              .mkString(", ")
            println(s"$span: $rankedList")
          }
      }
    }
  }

  def main(args: Array[String]): Unit = {
    //default values
    var workDir = amm.pwd
    var modelDir = amm.pwd / "models" / "newParsing-GAT1-fc2-newSim-decay-6"
    var paramPath = modelDir / "params.serialized"
    var modelCachePath = modelDir / "model.serialized"
    val modelConfig = ModelConfig()

    var modelNotEntered: Boolean = true

   while (modelNotEntered) {
    printResult("Enter model path")
    System.out.flush()
      try {
        val line: String = scala.io.StdIn.readLine()
        if (line.strip().nonEmpty) {
          workDir = Path(line, amm.pwd)
          modelDir = workDir / "newParsing-GAT1-fc2-newSim-decay-6"
          paramPath = modelDir / "params.serialized"
          modelCachePath = modelDir / "model.serialized"
          modelNotEntered = false
        }
      } catch {
        case e: Throwable =>
          println(s"Got exception: ${e.getMessage}")
          e.printStackTrace(System.out)
      }
    }

    val model =
      loadModel(paramPath, modelCachePath, modelConfig, numOfThreads = 8)

    val pc = (
      ParamCollection.fromFile(paramPath)
    )

    import java.io.ObjectOutputStream
    import java.io.ByteArrayOutputStream
    val ser = model
    val baos = new ByteArrayOutputStream()
    val oos = new ObjectOutputStream(baos)
    oos.writeObject(ser)
    oos.close()
    val size: Float = (baos.size())/1000000

    printResult("Size: " + size + "MB")
    printResult("Num of Parameters: " + pc.allParams.size)

    val service = model.PredictionService(numOfThreads = 8, predictTopK = 5)
    printResult("Type Inference Service successfully started.")
    printResult(s"Current working directory: ${amm.pwd}")

    var parserNotEntered: Boolean = true
    var parserPath: Path = null
   while (parserNotEntered) {
      printResult("Enter parser path: ")
      System.out.flush()
      try {
        val line = scala.io.StdIn.readLine()
        if(line.strip().nonEmpty) {
          parserPath = Path(line, amm.pwd)
          parserNotEntered = false
        }
      } catch {
        case e: Throwable =>
          println(s"Got exception: ${e.getMessage}")
          e.printStackTrace(System.out)
      }
   }
   while (true) {
      printResult("Enter project path: ")
      System.out.flush()
      try {
        val line = scala.io.StdIn.readLine()
        if(line.strip().nonEmpty) {
          val sourcePath = Path(line, amm.pwd)
          val results = service.predictOnProject(sourcePath, parserPath, warnOnErrors = false)
          PredictionResults(results).prettyPrint()
          return
        }
      } catch {
        case e: Throwable =>
          println(s"Got exception: ${e.getMessage}")
          e.printStackTrace(System.out)
      }
    }
  }
}
